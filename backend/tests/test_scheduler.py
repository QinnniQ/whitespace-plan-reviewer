import sys
from itertools import product
from pathlib import Path
from random import Random

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / "backend"), str(ROOT)]

from app.scheduler import Task, _finish_lower_bound, schedule  # noqa: E402
from check_contract import validate_schedule_response  # noqa: E402


def task(id, duration_days, depends_on=(), owner=None):
    return {"id": id, "name": id, "owner": owner, "duration_days": duration_days, "depends_on": list(depends_on)}


def checked_schedule(tasks, deadline):
    result = schedule(tasks, deadline)
    assert validate_schedule_response({"tasks": tasks, "deadline_day": deadline}, result) == []
    return result


def test_single_task_ends_after_its_duration():
    result = schedule([task("A", 3)], 10)
    assert result["schedule"] == [{"id": "A", "start_day": 0, "end_day": 3}]
    assert result["end_day"] == 3


def test_dependent_task_starts_after_its_dependency():
    result = schedule([task("A", 3), task("B", 2, ["A"])], 10)
    by_id = {item["id"]: item for item in result["schedule"]}
    assert by_id["B"]["start_day"] == 3
    assert result["end_day"] == 5


def test_out_of_order_chain_waits_for_both_branches():
    tasks = [task("D", 1, ["C", "B"]), task("C", 2, ["A"]), task("B", 4, ["A"]), task("A", 3)]
    result = checked_schedule(tasks, 8)
    assert result["end_day"] == 8
    assert result["meets_deadline"]


def test_one_owner_works_back_to_back_while_others_work_in_parallel():
    tasks = [
        task("A", 3, owner="Ann"), task("B", 4, owner="Ann"), task("C", 7, owner="Bob"),
        task("D", 7), task("E", 7),
    ]
    result = checked_schedule(tasks, 5)
    assert result["end_day"] == 7
    assert result["days_late"] == 2


@pytest.mark.parametrize("scale", [1, 10**30])
def test_optimum_requires_leaving_an_owner_idle(scale):
    # Ann could start the five-day job on day zero. Waiting for Bob instead
    # unlocks his eight-day job on day two and attains the ten-day chain bound.
    tasks = [
        task("long", 5 * scale, owner="Ann"), task("prep", scale, owner="Bob"),
        task("handoff", scale, ["prep"], owner="Ann"),
        task("finish", 8 * scale, ["handoff"], owner="Bob"),
    ]
    result = checked_schedule(tasks, 10 * scale)
    assert result["end_day"] == 10 * scale
    assert result["schedule"][0]["start_day"] >= 2 * scale


@pytest.mark.parametrize("duration", [3, 10**30 + 1])
def test_shared_owner_can_force_finish_beyond_both_simple_lower_bounds(duration):
    tasks = [
        task("ready", 1), task("A", duration, ["ready"], "Ann"),
        task("B", duration, ["ready"], "Ann"), task("done", 1, ["A", "B"]),
    ]
    # Neither the dependency chain nor Ann's workload alone includes all four durations.
    assert checked_schedule(tasks, 10)["end_day"] == 2 * duration + 2


def test_sixty_tasks_across_six_owners_reach_the_chain_bound():
    tasks = []
    for chain in range(6):
        for step in range(10):
            predecessors = [f"{chain}-{step - 1}"] if step else []
            tasks.append(task(f"{chain}-{step}", 1, predecessors, str((chain + step) % 6)))
    assert checked_schedule(tasks[::-1], 10)["end_day"] == 10


@pytest.mark.parametrize(("tasks", "cycle"), [
    ([task("self", 1, ["self"])], {"self"}),
    ([task("blocked", 1, ["A"]), task("A", 1, ["B"]), task("B", 1, ["C"]),
      task("C", 1, ["A"]), task("independent", 1)], {"A", "B", "C"}),
])
def test_cycle_names_exactly_the_tasks_on_the_loop(tasks, cycle):
    result = checked_schedule(tasks, 10)
    assert result["status"] == "cycle"
    assert set(result["cycle"]) == cycle


def test_empty_schedule_and_negative_deadline():
    result = checked_schedule([], -1)
    assert result["end_day"] == 0
    assert result["days_late"] == 1


@pytest.mark.parametrize("unit", [1, 6, 10**80 + 7])
def test_reconstructs_exact_days_and_compares_the_original_deadline(unit):
    tasks = [task("handoff", 3 * unit, ["prep"], "Ada"), task("prep", 2 * unit)]
    result = checked_schedule(tasks, 5 * unit - 1)
    assert result["schedule"] == [
        {"id": "handoff", "start_day": 2 * unit, "end_day": 5 * unit},
        {"id": "prep", "start_day": 0, "end_day": 2 * unit},
    ]
    assert result["days_late"] == 1


def test_reduced_horizon_can_still_require_arbitrary_precision():
    large = 10**40
    tasks = [task("a", 7 * large, owner="A"), task("b", 7 * (large + 1), owner="A")]
    assert checked_schedule(tasks, 0)["end_day"] == 7 * (2 * large + 1)


@pytest.mark.parametrize(("left", "right", "job_days", "optimum"), [
    (3, 3, 2, 14),  # Best packing of three jobs is 2 + 4 days across the windows.
    (4, 5, 3, 17),  # 3 + 6 days. The nearest multiple to five is above it.
])
def test_indivisible_work_with_a_shared_tail(left, right, job_days, optimum):
    tasks = [task("x", left), task("gate", 2, ["x"], "A"), task("y", right, ["gate"])]
    tasks += [task(str(i), job_days, owner="A") for i in range(3)]
    tasks.append(task("close", 5, [t["id"] for t in tasks], "B"))
    assert _finish_lower_bound([Task(**t) for t in tasks]) == optimum
    assert checked_schedule(tasks, optimum)["end_day"] == optimum


def test_work_outside_a_join_can_overlap_its_tail():
    tasks = [task("x", 3), task("gate", 2, ["x"], "A"), task("y", 3, ["gate"]),
             task("close", 5, ["y"], "B"), task("unrelated", 10, owner="A")]
    assert checked_schedule(tasks, 15)["end_day"] == 15


def test_small_schedules_against_exhaustive_day_assignments():
    rng = Random(42)
    for case in range(80):
        tasks = [
            task(str(i), rng.randint(1, 3), [str(j) for j in range(i) if rng.random() < 0.3],
                 rng.choice(["Ann", "Bob", None]))
            for i in range(4)
        ]
        bound = _finish_lower_bound([Task(**t) for t in tasks])
        rng.shuffle(tasks)
        finish = checked_schedule(tasks, 10)["end_day"]
        assert bound <= finish
        if case % 2 == 0:
            unit = 10**30 + case + 1
            scaled = [t | {"duration_days": t["duration_days"] * unit} for t in tasks]
            assert checked_schedule(scaled, 10)["end_day"] == finish * unit
        # Independently try every way to finish at least one day sooner.
        domains = [range(finish - t["duration_days"]) for t in tasks]
        for days in product(*domains):
            starts = {t["id"]: s for t, s in zip(tasks, days)}
            ends = {t["id"]: s + t["duration_days"] for t, s in zip(tasks, days)}
            if any(starts[t["id"]] < ends[d] for t in tasks for d in t["depends_on"]):
                continue
            assert any(
                a["owner"] is not None and a["owner"] == b["owner"]
                and starts[a["id"]] < ends[b["id"]] and starts[b["id"]] < ends[a["id"]]
                for i, a in enumerate(tasks) for b in tasks[i + 1:]
            ), f"Found a shorter feasible schedule: {starts}"
