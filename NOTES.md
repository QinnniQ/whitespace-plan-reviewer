# Notes

## Time spent

[To confirm before submission: ___ hours of hands-on direction and review; ___ hours of automated execution and environment troubleshooting.]

## What I did

I made Nora's deadline decision the starting point. She can see the earliest finish, inspect a highlighted passage, correct a task and recalculate. Each correction keeps the original quotation so she can compare her change with the plan.

I chose CP-SAT because a greedy task order can delay a short handoff that would free another owner to start work. The solver considers alternative orders and reports a finish day only when it can prove optimality. Shared duration factors and bounds on each owner's work help it reach that proof.

I chose GPT-5.4 after a smaller model followed Harbour Run's embedded day-99 instruction and missed an insurance dependency. The saved review identifies day 30 and the approval loop. I required a separate check on the model's output. The review command validates types, IDs and dependencies, then matches each quotation to the plan, preserving case and collapsing whitespace.

## What I cut and why

I kept corrections in the open tab. Nora can try an alternative and reset it. Shared edits would need storage and rules about whose changes take precedence. Serving saved reviews also keeps model calls out of the web request.

## What is not ready

A matching quotation establishes that the passage exists. Nora still has to judge its meaning and spot omissions. A valid schedule with very large durations and no shared factor can exhaust the eight-second proof budget. The API returns HTTP 503 in that case.

## What I would do next and a rough estimate

I would spend half a day labelling a small set of unseen plans and comparing their reviews for missed tasks, conflicting dates and unsupported findings.

## How I used AI tools

I set the requirements and architectural constraints, directed the work in stages and evaluated the reported results at each milestone. Codex generated and refined the code and tests. It ran the exhaustive small-schedule comparisons, provider failure tests, live review generation, browser tests and contract checks.

## Environment variables my review command needs

`OPENAI_API_KEY` is required for generation. `REVIEW_MODEL` optionally selects another OpenAI Chat Completions model with strict structured-output support.
