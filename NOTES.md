# Notes

## Time spent

[To confirm before submission: ___ hours of hands-on direction and review; ___ hours of automated execution and environment troubleshooting.]

## What I did

Nora needs a finish date she can defend. A greedy scheduler can start a long job just when a short handoff would unlock someone else's work. CP-SAT compares task orders subject to prerequisites and one job per owner. Exact duration scaling and bounds on work that fits between commitments help it prove the earliest finish. The service names the tasks in a dependency loop before invoking the solver.

The review command uses GPT-5.4 to reconcile tables with later prose. A smaller model accepted Harbour Run's instruction to use day 99 and missed an insurance dependency. The saved GPT-5.4 review identifies the day-30 event, the conflicting five-week timetable and the approval loop. The plan is passed separately from instructions. Code checks types, IDs and references, then independently matches each quotation to the source, preserving case and collapsing whitespace.

The interface leads with the deadline decision. Nora can open a highlighted passage, correct the extraction and recalculate. A correction keeps its original evidence. The web application serves saved reviews without a model key.

## What I cut and why

Corrections stay in the open tab. This supports checking alternatives and resetting the review without introducing accounts, a database or shared approval state. One service serves the page and API.

## What is not ready

Quote matching establishes that a passage exists. Nora still needs to check completeness and interpretation. Extremely large durations with no common factor can exhaust the eight-second proof budget. The API then returns HTTP 503 without a completion estimate.

## What I would do next and a rough estimate

Allow half a day to label a small set of unseen plans and measure missed tasks, conflicting dates and unsupported findings.

## How I used AI tools

Codex implemented, tested and refined the application under human-directed requirements, architectural constraints and milestone reviews. Checks included exhaustive small schedules, mocked provider failures, live review generation, browser workflows and the supplied contract scripts.

## Environment variables my review command needs

`OPENAI_API_KEY` is required for generation. `REVIEW_MODEL` optionally selects another OpenAI Chat Completions model with strict structured-output support.
