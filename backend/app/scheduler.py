from collections import defaultdict
from graphlib import CycleError, TopologicalSorter
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


def _optimal_starts(tasks: list[Task], cutoff: float) -> dict[str, int]:
    # Doing every task in topological order, one at a time, always fits this horizon.
    horizon = sum(task.duration_days for task in tasks)
    # CP-SAT uses bounded integers internally and double precision objective bounds.
    # The JSON contract places no upper bound on durations.
    if horizon * (len(tasks) + 1) >= 2**52:
        return _search_large_days(tasks, cutoff)

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

    finish = model.new_int_var(0, horizon, "finish")
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


def _search_large_days(tasks: list[Task], cutoff: float) -> dict[str, int]:
    """Exact integer fallback for times beyond the solver's numeric range."""
    # Every feasible schedule has a topological order sorted by start day.
    # Replaying that order at the earliest available times can only improve it.
    chain_ends = {}
    owner_load = defaultdict(int)
    for task in tasks:  # already topologically sorted
        chain_ends[task.id] = task.duration_days + max(
            (chain_ends[d] for d in task.depends_on), default=0
        )
        if task.owner is not None:
            owner_load[task.owner] += task.duration_days
    lower_bound = max(max(chain_ends.values()), max(owner_load.values(), default=0))
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
