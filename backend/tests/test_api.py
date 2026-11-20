import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402
from app import scheduler  # noqa: E402


TASK = {"id": "A", "name": "Book the hall", "owner": None, "duration_days": 1, "depends_on": []}


def test_plans_are_listed():
    response = TestClient(app).get("/api/plans")
    assert response.status_code == 200
    assert {plan["id"] for plan in response.json()} == {"spring-market", "lantern-festival", "harbour-run"}


@pytest.mark.parametrize("body", [
    {}, {"tasks": []}, {"deadline_day": 1}, {"tasks": {}, "deadline_day": 1},
    {"tasks": [], "deadline_day": None}, {"tasks": [], "deadline_day": True},
    {"tasks": [], "deadline_day": "1"}, {"tasks": [], "deadline_day": 1.0},
    {"tasks": [None], "deadline_day": 1},
    {"tasks": [TASK, TASK], "deadline_day": 1},
    {"tasks": [TASK | {"id": str(i)} for i in range(61)], "deadline_day": 1},
])
def test_invalid_request_returns_json_client_error(body):
    response = TestClient(app).post("/api/schedule", json=body)
    assert response.status_code == 422
    assert response.json()["detail"]


@pytest.mark.parametrize("change", [
    {"id": 1}, {"name": None}, {"owner": False}, {"depends_on": "A"},
    {"depends_on": [1]}, {"depends_on": ["missing"]}, {"duration_days": 0},
    {"duration_days": -2}, {"duration_days": True}, {"duration_days": 1.5},
    {"duration_days": "3"},
])
def test_invalid_task_reports_the_field_or_unknown_id(change):
    response = TestClient(app).post("/api/schedule", json={"tasks": [TASK | change], "deadline_day": 1})
    assert response.status_code == 422
    assert next(iter(change)) in response.text or "missing" in response.text


@pytest.mark.parametrize("field", TASK)
def test_all_task_fields_are_required(field):
    task = TASK.copy()
    del task[field]
    response = TestClient(app).post("/api/schedule", json={"tasks": [task], "deadline_day": 1})
    assert response.status_code == 422
    assert field in response.text


def test_sixty_tasks_and_extra_fields_are_accepted():
    tasks = [TASK | {"id": str(i), "owner": "", "quote": "source"} for i in range(60)]
    response = TestClient(app).post("/api/schedule", json={"tasks": tasks, "deadline_day": 59, "notes": []})
    assert response.status_code == 200
    assert response.json()["end_day"] == 60
    assert response.json()["days_late"] == 1


def test_cycle_is_a_successful_response():
    task = TASK | {"depends_on": ["A"]}
    response = TestClient(app).post("/api/schedule", json={"tasks": [task], "deadline_day": 1})
    assert response.status_code == 200
    assert response.json() == {
        "status": "cycle", "cycle": ["A"], "schedule": [], "end_day": None,
        "deadline_day": 1, "meets_deadline": None, "days_late": None,
    }


def test_expired_search_reports_no_completion_day(monkeypatch):
    monkeypatch.setattr(scheduler, "SOLVE_SECONDS", 0.0)
    response = TestClient(app).post("/api/schedule", json={"tasks": [TASK], "deadline_day": 1})
    assert response.status_code == 503
    assert "prove" in response.json()["detail"]
