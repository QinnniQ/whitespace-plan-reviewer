import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .scheduler import ScheduleRequest, ScheduleTimeout, build_schedule, schedule

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
DIST = ROOT / "frontend" / "dist"

app = FastAPI()


@app.exception_handler(ScheduleTimeout)
async def scheduling_timeout(request, exc):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.get("/api/plans")
def list_plans():
    plans = []
    for path in sorted((DATA / "plans").glob("*.md"), reverse=True):
        title = next((line.lstrip("# ").strip() for line in path.read_text(encoding="utf-8").splitlines() if line.startswith("#")), path.stem)
        plans.append({"id": path.stem, "title": title})
    return plans


@app.get("/api/plans/{plan_id}")
def get_plan(plan_id: str):
    text = (DATA / "plans" / f"{plan_id}.md").read_text(encoding="utf-8")
    review = json.loads((DATA / "reviews" / f"{plan_id}.json").read_text(encoding="utf-8"))
    result = None
    schedule_error = None
    if review["deadline_day"] is not None:
        if len(review["tasks"]) > 60:
            schedule_error = "Scheduling supports up to 60 tasks."
        else:
            try:
                result = schedule(review["tasks"], review["deadline_day"])
            except ScheduleTimeout:
                schedule_error = "The calculation timed out. Try again to check the earliest finish."
    return {
        "id": plan_id,
        "text": text,
        "review": review,
        "schedule": result,
        "schedule_error": schedule_error,
    }


@app.post("/api/schedule")
def post_schedule(body: ScheduleRequest):
    return build_schedule(body)


if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True))
