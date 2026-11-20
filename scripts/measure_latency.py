"""Measure a public trial from the client and compare the server's scheduling time."""

import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from time import perf_counter
from urllib.request import Request, urlopen

from check_readiness import ROOT, job_shop, validate_schedule_response


def measure(base, payload=None):
    path = "/api/plans" if payload is None else "/api/schedule"
    request = Request(base + path, headers={"User-Agent": "WhiteSpace-Readiness/1.0"})
    if payload is not None:
        request.data = json.dumps(payload).encode()
        request.add_header("Content-Type", "application/json")
    started = perf_counter()
    with urlopen(request, timeout=45) as response:
        result = json.load(response)
        elapsed = perf_counter() - started
        timing = response.headers.get("Server-Timing", "")
    if payload is not None:
        errors = validate_schedule_response(payload, result)
        if errors:
            raise ValueError(errors)
    print(f"{path}  {elapsed:.3f} s  {timing}", flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    parser.add_argument("--wake", action="store_true", help="Send one POST after confirming sleep.")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    example = json.loads((ROOT / "examples/schedule-request.json").read_text())
    if args.wake:
        assert measure(base, example)["end_day"] == 9
        return

    for _ in range(5):
        assert len(measure(base)) == 3
        assert measure(base, example)["end_day"] == 9

    barrier = Barrier(3)

    def simultaneous(case):
        jobs, steps, optimum = case
        payload = job_shop(jobs, steps, 42)
        barrier.wait(timeout=5)
        assert measure(base, payload)["end_day"] == optimum

    print("Three simultaneous 60-task schedules")
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(simultaneous, [(6, 10, 140), (10, 6, 123), (15, 4, 167)]))


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Run without python -O so all timed requests and checks execute.")
    main()
