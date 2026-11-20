"""Check a running Plan Reviewer and time deterministic scheduling workloads."""

import argparse
import json
import random
import re
import sys
from pathlib import Path
from time import perf_counter
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from check_contract import validate_review_shape, validate_schedule_response


def job_shop(jobs, steps, seed):
    """Each job is a chain that visits the same owners in a shuffled order."""
    rng = random.Random(seed)
    tasks = []
    for job in range(jobs):
        owners = list(range(steps))
        rng.shuffle(owners)
        for step, owner in enumerate(owners):
            task_id = f"{job}-{step}"
            tasks.append({
                "id": task_id, "name": task_id, "owner": str(owner),
                "duration_days": rng.randint(1, 20),
                "depends_on": [f"{job}-{step - 1}"] if step else [],
            })
    return {"tasks": tasks, "deadline_day": 100}


def signoff_windows():
    """One officer must fit other work around signoffs between review rounds."""
    tasks = []

    def add(name, owner, duration, waits_for):
        tasks.append({"id": name, "name": name, "owner": owner,
                      "duration_days": duration, "depends_on": waits_for})

    for i in range(12):
        add(f"round-{i}", "Committee", 11, [f"sign-{i - 1}"] if i else [])
        if i < 11:
            add(f"sign-{i}", "Officer", 1, [f"round-{i}"])
    for i, duration in enumerate([2, 4, 6] * 10 + [2] * 6):
        add(f"inspection-{i}", "Officer", duration, [])
    add("close", None, 1, [task["id"] for task in tasks])
    return {"tasks": tasks, "deadline_day": 150}


def check(base):
    def get(path):
        with urlopen(base + path, timeout=15) as response:
            return json.load(response)

    def post(label, body, *, allow_timeout=False):
        request = Request(base + "/api/schedule", data=json.dumps(body).encode(),
                          headers={"Content-Type": "application/json"})
        start = perf_counter()
        try:
            with urlopen(request, timeout=15) as response:
                result = json.load(response)
        except HTTPError as error:
            if error.code != 503 or not allow_timeout:
                raise
            result = None
        elapsed = perf_counter() - start
        if result is None:
            outcome = "503, optimum unproven"
        else:
            errors = validate_schedule_response(body, result)
            if errors:
                raise ValueError(errors)
            outcome = f"{result['status']}, end {result['end_day']}"
        print(f"{label}: {len(body['tasks'])} tasks, {outcome}, {elapsed:.3f} s", flush=True)
        if elapsed > 10:
            raise ValueError(f"{label} exceeded the ten-second contract")
        return result

    with urlopen(base + "/", timeout=15) as page:
        assert '<div id="root">' in page.read().decode()
    plans = get("/api/plans")
    expected = {"spring-market": 18, "lantern-festival": 52, "harbour-run": None}
    assert {plan["id"] for plan in plans} == set(expected)
    quotes = 0
    for plan in plans:
        slug = plan["id"]
        detail = get("/api/plans/" + slug)
        review = detail["review"]
        source = (ROOT / "data/plans" / f"{slug}.md").read_text(encoding="utf-8")
        assert source.splitlines() == detail["text"].splitlines()
        assert review == json.loads((ROOT / "data/reviews" / f"{slug}.json").read_text(encoding="utf-8"))
        assert not validate_review_shape(review)
        normalized = re.sub(r"\s+", " ", source)
        for quote in [item["quote"] for item in review["tasks"] + review["findings"]] + [review.get("deadline_quote")]:
            if quote is not None:
                assert quote.strip() and re.sub(r"\s+", " ", quote) in normalized, slug
                quotes += 1
        assert not validate_schedule_response(review, detail["schedule"])
        result = post(slug, review)
        assert result["end_day"] == detail["schedule"]["end_day"] == expected[slug]
        if slug == "spring-market":
            review["tasks"][0]["duration_days"] += 10
            assert post("Spring Market correction", review)["end_day"] == 28
    print(f"Verified {quotes} source quotations.")
    for jobs, steps in [(6, 10), (10, 6), (15, 4)]:
        post(f"{jobs} chains x {steps} owners (seed 42)", job_shop(jobs, steps, 42), allow_timeout=True)
    post("Interleaved signoffs and inspections", signoff_windows(), allow_timeout=True)

    # Also exercise the scheduler's exact, arbitrary-precision fallback.
    large = job_shop(10, 6, 42)
    for task in large["tasks"]:
        task["duration_days"] *= 10**24
    post("Large-integer stress case", large, allow_timeout=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    check(parser.parse_args().base_url.rstrip("/"))
