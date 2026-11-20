from collections import defaultdict
from graphlib import CycleError, TopologicalSorter
from math import gcd
from time import monotonic

from ortools.sat.python import cp_model
from pydantic import BaseModel, ConfigDict, Field, model_validator


# Leave room for request validation, model construction and response serialization.
SOLVE_SECONDS = 8.0


class Task(BaseModel):
    model_config = ConfigDict(strict=True)

    id: str
    name: str
    owner: str | None
    duration_days: int = Field(ge=1)
    depends_on: list[str]


class ScheduleRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    tasks: list[Task] = Field(max_length=60)
    deadline_day: int

    @model_validator(mode="after")
    def check_references(self):
        ids = set()
        for task in self.tasks:
            if task.id in ids:
                raise ValueError(f"Duplicate task id {task.id!r}")
            ids.add(task.id)
        for task in self.tasks:
            for dependency in task.depends_on:
                if dependency not in ids:
                    raise ValueError(f"Task {task.id!r} depends on unknown id {dependency!r}")
        return self


class ScheduleTimeout(TimeoutError):
    def __init__(self):
        super().__init__("Could not prove the earliest finish within the scheduling time limit.")


def _path_owner_bound(tasks: list[Task], path: list[Task], path_days: int) -> int:
    """Lower bound on the time to finish a set of tasks containing this dependency path."""
    path_ids = {t.id for t in path}
    load = defaultdict(int)
    off_path_unit = defaultdict(int)
    for task in tasks:
        if task.owner is not None:
            load[task.owner] += task.duration_days
            if task.id not in path_ids:
                off_path_unit[task.owner] = gcd(off_path_unit[task.owner], task.duration_days)

    bound = max(path_days, max(load.values(), default=0))
    for owner, unit in off_path_unit.items():
        if unit == 1:
            continue
        # This owner's path tasks separate windows. Other work by the owner
        # fits entirely in individual windows, in multiples of 'unit'.
        gaps = [0]
        for task in path:
            if task.owner == owner:
                gaps.append(0)
            else:
                gaps[-1] += task.duration_days
        # A window must fit both its path length h and its owner load x.
        # 2*max(h,x) = h+x+abs(h-x). Bound the last term by the distance
        # from h to the nearest multiple of unit. Separators count in both totals.
        mismatch = sum(min(h % unit, (-h) % unit) for h in gaps)
        bound = max(bound, (path_days + load[owner] + mismatch + 1) // 2)
    return bound


def _finish_lower_bound(tasks: list[Task]) -> int:
    # Inputs are topologically ordered. Keep a longest path ending at each task.
    paths = {}
    path_days = {}
    for task in tasks:
        parent = max(task.depends_on, key=path_days.__getitem__, default=None)
        paths[task.id] = paths.get(parent, []) + [task]
        path_days[task.id] = path_days.get(parent, 0) + task.duration_days

    # tail[t] is the length of the longest chain still required after t ends.
    tail = dict.fromkeys(path_days, 0)
    for task in reversed(tasks):
        for parent in task.depends_on:
            tail[parent] = max(tail[parent], task.duration_days + tail[task.id])

    bound = 0
    for remaining in set(tail.values()):
        # All these tasks must finish at least 'remaining' days before the end.
        # Their prerequisites have longer tails, so each stored path is also in the set.
        required = [t for t in tasks if tail[t.id] >= remaining]
        last = max(required, key=lambda t: path_days[t.id])
        bound = max(bound, remaining + _path_owner_bound(required, paths[last.id], path_days[last.id]))
    return bound


def _optimal_starts(tasks: list[Task], cutoff: float) -> dict[str, int]:
    # Fixing each owner's order turns a schedule into a DAG. Its earliest
    # starts are longest-path sums, hence multiples of the duration GCD.
    unit = gcd(*(t.duration_days for t in tasks))
    if unit > 1:
        tasks = [t.model_copy(update={"duration_days": t.duration_days // unit}) for t in tasks]
    # Doing every task in topological order, one at a time, always fits this horizon.
    horizon = sum(task.duration_days for task in tasks)
    lower_bound = _finish_lower_bound(tasks)
    # CP-SAT uses bounded integers internally and double precision objective bounds.
    # The JSON contract places no upper bound on durations.
    if horizon * (len(tasks) + 1) >= 2**52:
        starts = _search_large_days(tasks, lower_bound, cutoff)
    else:
        starts = _cp_sat_starts(tasks, horizon, lower_bound, cutoff)
    return {task_id: start * unit for task_id, start in starts.items()}


def _cp_sat_starts(tasks: list[Task], horizon: int, lower_bound: int, cutoff: float) -> dict[str, int]:
    model = cp_model.CpModel()
    starts = {}
    ends = {}
    intervals = defaultdict(list)
    for task in tasks:
        start = model.new_int_var(0, horizon - task.duration_days, task.id)
        starts[task.id] = start
        ends[task.id] = start + task.duration_days
        if task.owner is not None:
            interval = model.new_fixed_size_interval_var(start, task.duration_days, task.id)
            intervals[task.owner].append(interval)

    finish = model.new_int_var(lower_bound, horizon, "finish")
    for task in tasks:
        for dependency in task.depends_on:
            model.add(starts[task.id] >= ends[dependency])
        model.add(finish >= ends[task.id])
    for owner_intervals in intervals.values():
        model.add_no_overlap(owner_intervals)
    model.minimize(finish)

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 4
    solver.parameters.max_time_in_seconds = max(0.0, cutoff - monotonic())
    status = solver.solve(model)
    if status in (cp_model.UNKNOWN, cp_model.FEASIBLE):
        raise ScheduleTimeout()
    if status != cp_model.OPTIMAL:
        raise RuntimeError(f"Unexpected scheduling solver status: {solver.status_name(status)}")
    return {task_id: solver.value(start) for task_id, start in starts.items()}


def _search_large_days(tasks: list[Task], lower_bound: int, cutoff: float) -> dict[str, int]:
    """Exact integer fallback for times beyond the solver's numeric range."""
    # Every feasible schedule has a topological order sorted by start day.
    # Replaying that order at the earliest available times can only improve it.
    best_finish = sum(task.duration_days for task in tasks) + 1
    best_ends = {}

    def search(ends, owner_free, finish):
        nonlocal best_finish, best_ends
        if monotonic() >= cutoff:
            raise ScheduleTimeout()
        if len(ends) == len(tasks):
            best_finish, best_ends = finish, ends
            return
        for task in tasks:
            if best_finish == lower_bound or finish >= best_finish:
                return
            if task.id in ends or not all(d in ends for d in task.depends_on):
                continue
            ready = max((ends[d] for d in task.depends_on), default=0)
            start = max(ready, owner_free.get(task.owner, 0))
            end = start + task.duration_days
            if end < best_finish:
                available = owner_free if task.owner is None else owner_free | {task.owner: end}
                search(ends | {task.id: end}, available, max(finish, end))

    search({}, {}, 0)
    return {t.id: best_ends[t.id] - t.duration_days for t in tasks}


def build_schedule(request: ScheduleRequest) -> dict:
    by_id = {t.id: t for t in request.tasks}
    graph = TopologicalSorter({t.id: t.depends_on for t in request.tasks})
    try:
        ordered = [by_id[task_id] for task_id in graph.static_order()]
    except CycleError as error:
        # graphlib repeats the first id at the end of its cycle witness.
        return {
            "status": "cycle", "cycle": error.args[1][:-1], "schedule": [],
            "end_day": None, "deadline_day": request.deadline_day,
            "meets_deadline": None, "days_late": None,
        }

    starts = _optimal_starts(ordered, monotonic() + SOLVE_SECONDS) if ordered else {}
    items = [
        {"id": t.id, "start_day": starts[t.id], "end_day": starts[t.id] + t.duration_days}
        for t in request.tasks
    ]
    end_day = max((item["end_day"] for item in items), default=0)
    return {
        "status": "scheduled",
        "schedule": items,
        "end_day": end_day,
        "deadline_day": request.deadline_day,
        "meets_deadline": end_day <= request.deadline_day,
        "days_late": max(0, end_day - request.deadline_day),
        "cycle": [],
    }


def schedule(tasks, deadline_day):
    return build_schedule(ScheduleRequest(tasks=tasks, deadline_day=deadline_day))
