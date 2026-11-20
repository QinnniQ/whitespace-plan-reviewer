# Notes

## Time spent

Approximately **2 hours of hands-on engineering direction and review**, excluding additional automated execution and environment troubleshooting, which were not separately tracked.

## What I did

I made Nora's deadline decision the starting point. She can see the earliest finish, inspect a highlighted source passage, correct a task and recalculate. Each correction retains the original quotation so she can compare her changes against the plan.

I selected CP-SAT because a greedy task order can delay a short handoff that would otherwise free another owner to begin work. The solver considers alternative task orders and reports a completion day only when optimality is proven. Stronger resource bounds and exact duration scaling help establish that proof efficiently.

The reviewer uses GPT-5.4 after an initial smaller model followed Harbour Run's embedded day-99 instruction and missed an insurance dependency. The corrected review identifies day 30 and the approval cycle. I required deterministic validation beyond the model's structured output: the review command checks field types, task IDs and dependencies, then verifies quotations against the original plan using case-sensitive, whitespace-normalised matching.

## What I cut and why

I kept corrections within the current browser session. Nora can explore alternatives and reset changes without introducing unnecessary persistence. Shared edits would require storage, access controls and conflict resolution. Serving saved reviews also keeps model calls out of the interactive workflow.

## What is not ready

A matching quotation establishes that the passage exists, not that the model interpreted it correctly. Nora must still assess its meaning and identify omissions. Extremely large scheduling workloads without shared duration factors can also exhaust the eight-second optimality proof budget, in which case the API returns HTTP 503 rather than an unproven result.

## What I would do next and a rough estimate

I would spend approximately half a day evaluating a labelled set of unseen plans, comparing extracted tasks, deadlines and findings against expected results to identify omissions, conflicting dates and unsupported conclusions.

## How I used AI tools

I defined the requirements and architectural constraints, directed implementation through incremental milestones and assessed the reported verification results before proceeding. Codex generated and refined the implementation and tests, including exhaustive small-schedule comparisons, provider failure tests, live review generation, browser tests and contract verification.

## Environment variables my review command needs

`OPENAI_API_KEY` is required for review generation. `REVIEW_MODEL` optionally selects another OpenAI Chat Completions model supporting strict structured output.