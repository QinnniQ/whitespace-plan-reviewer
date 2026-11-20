# WhiteSpace Plan Reviewer

Plan Reviewer helps a council events officer decide whether an event can be ready by its deadline. It combines a source-linked review of the committee's plan with a schedule that accounts for prerequisites and each person's availability. [Open the live application at whitespace.nickcloud.dev](https://whitespace.nickcloud.dev).

## Reviewing a plan

Spring Market finishes on day 18 against a day-21 deadline. Lantern Festival finishes seven days late. Harbour Run has a circular dependency between course approval and event insurance.

Choose **View in plan** beside a task or finding to inspect its source quotation when one is available. Task names, owners, durations, prerequisites and the deadline can all be corrected. Saving a schedule edit recalculates the result. Corrections stay in the open tab and retain their original quotations. **Reset to original review** restores the saved values.

## Architecture

- **Extraction.** The `./review` command reads a Markdown plan and requests structured JSON from GPT-5.4. It validates field types, task references and each non-null quotation against the source, preserving case and collapsing whitespace. It writes the output only after validation succeeds.
- **Scheduling.** FastAPI accepts up to 60 tasks at `POST /api/schedule`. OR-Tools CP-SAT searches for the earliest finish while respecting dependencies and preventing overlap for each named owner. The endpoint reports cycles explicitly. A difficult workload, including one with very large coprime durations, can exhaust the eight-second proof budget and return HTTP 503.
- **Web application.** FastAPI serves the built React interface, the original plans in `data/plans/` and their saved reviews in `data/reviews/`. Opening a plan and recalculating edits require no model key. [Schedule and review contracts](docs/contracts.md).

## Run locally

The Docker image includes the compiled frontend and the Python backend. Run both commands from the repository root.

```sh
docker build -t whitespace-plan-reviewer .
docker run --rm -p 127.0.0.1:8000:8000 whitespace-plan-reviewer
```

Open [localhost:8000](http://localhost:8000). For a source checkout on macOS or Linux, use Python 3.11 or newer, Node.js 22, npm and Make. Run `make setup`, then `make run`.

## Generate a review

With the repository's Python virtual environment installed, set `OPENAI_API_KEY` in the shell. The optional `REVIEW_MODEL` selects another OpenAI model that supports strict structured output. Run these commands from the repository root in a POSIX shell or Git Bash:

```sh
mkdir -p out
./review data/plans/spring-market.md out/spring-market.json
```

## Verification

After `make setup`, run `make test` for the backend suite. The browser suite builds the frontend and starts its own local FastAPI server:

```sh
(cd frontend && npx playwright install chromium && npm test)
```

The supplied checker validates the public schedule response. The readiness check also compares the served plans, reviews and quotations with the repository and runs the 60-task regression cases.

```sh
python3 check_contract.py schedule https://whitespace.nickcloud.dev
python3 scripts/check_readiness.py https://whitespace.nickcloud.dev --require-optimal
```

## Deployment and engineering notes

A Cloudflare Worker forwards requests to one named Container running FastAPI, React and the solver. The Container sleeps after five idle minutes, so the first request can take several seconds. [Deployment configuration](wrangler.jsonc) · [Public verification and timings](docs/hosted-trial.md#stage-4d-custom-domain).

[Original assignment brief](docs/assignment-original.md) · [Engineering decisions, limitations and AI assistance](NOTES.md).
