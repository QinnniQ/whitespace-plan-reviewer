# Notes

## Time spent

## What I did

I used GPT-5.4 for structured extraction. On the sample plans it reconciled the
task tables with later paragraphs, including prerequisites that form a cycle.
The CLI checks JSON types, IDs, references, and source quotations before saving.
It asks for a fresh extraction once if these checks fail.

## What I cut and why

## What is not ready

An exact quotation proves that the passage exists. Interpreting it and finding
every relevant passage still depend on the model. I checked the three saved
reviews against their plans, including the injected instruction in Harbour Run.

## What I would do next and a rough estimate

## How I used AI tools

Codex implemented the reviewer and tests. Checks included mocked provider failures,
the assignment's contract checker, and fresh CLI runs against OpenAI.

## Environment variables my review command needs

`OPENAI_API_KEY` supplies the credential. `REVIEW_MODEL` optionally overrides
`gpt-5.4` with a Chat Completions model supporting strict JSON Schema.
