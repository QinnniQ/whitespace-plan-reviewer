# Notes

## Time spent

[To confirm before submission: ___ hours of hands-on direction and review; ___ hours of automated execution and environment troubleshooting.]

## What I did

Nora needs a finish date she can defend. A greedy scheduler can keep someone busy on a long task just when a short handoff would unlock another person's work. CP-SAT considers alternative orders. Each task occupies a fixed interval, each prerequisite constrains its start, and each named owner can work on one task at a time. The service reports an earliest finish only after proving it. It names the tasks in a dependency loop.

The review command uses GPT-5.4 to reconcile tables with later prose. An earlier smaller-model run accepted Harbour Run's instruction to use day 99 and missed an insurance dependency. The saved GPT-5.4 review identifies the day-30 event, the conflicting five-week timetable and the circular approval requirement. The plan is passed separately from the review instructions. Code checks types, IDs, references and each quotation against the original text, preserving case and collapsing whitespace. A structurally valid answer can still contain an invented quotation or misinterpret a genuine one.

The interface leads with the deadline decision. Nora can open a highlighted passage, correct the extraction and recalculate. A correction keeps its original evidence. The web application serves saved reviews without a model key.

## What I cut and why

Corrections stay in the open tab. This supports checking alternatives and resetting the review without introducing accounts, a database or shared approval state. One service serves the page and API.

## What is not ready

Quote matching verifies the passage's existence. Completeness and interpretation still need editorial judgment. Exact duration scaling and tighter workload bounds resolved both hosted timeout cases in local Docker tests. Very large coprime durations can still exhaust the proof budget. Cloudflare's trial hostname rejected the assignment checker's default Python client.

## What I would do next and a rough estimate

Allow half a day to repeat the solver regressions on the intended host and verify the final hostname with the original checker. A small labelled set of unseen plans would help measure missed tasks and unsupported findings.

## How I used AI tools

Codex implemented, tested and refined the application under human-directed requirements, architectural constraints and milestone reviews. Checks included exhaustive small schedules, mocked provider failures, live review generation, browser workflows and the supplied contract scripts.

## Environment variables my review command needs

`OPENAI_API_KEY` is required for generation. `REVIEW_MODEL` optionally selects another OpenAI Chat Completions model with strict structured-output support.
