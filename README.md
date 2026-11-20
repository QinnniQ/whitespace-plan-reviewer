# Plan reviewer

This is the take-home assignment for the Artificial Intelligence Engineer role at WhiteSpace. It is sized for about two hours of work, deployment included, and you have one day to hand it in. Tell us in your note how long you spent. We would rather see good choices than more hours.

## The story

A town council's events officer approves the plans that volunteer committees send in for local events. Each plan is a few pages: goals, tasks, who does what, what depends on what, and a target date. She has to judge whether a plan is complete, consistent and achievable by its date. Her email to us is in [docs/client-email.md](docs/client-email.md).

## What you get

A small app that reviews a plan in three steps: a model reads it and lists its tasks and findings, code schedules the tasks, and a page shows the result.

The three sample plans are in `data/plans/`. The React interface reads their stored reviews through FastAPI and runs without an API key.

## Reviewing a plan

Select an event to see its earliest finish and deadline. Use the book beside a
task or **View in plan** beside a finding to highlight the first matching passage
in the original Markdown. Select a task name, the pencil beside the deadline, or
**Edit finding** to make a correction. Task and deadline changes recalculate the
schedule. A plan with an unknown deadline needs a day before it can be scheduled.

Corrections stay in memory for each plan in the open tab. Switching plans keeps
them. Reloading the page clears them. **Reset to original review** restores the
saved version for the selected plan. The original quotations and files in
`data/reviews/` are preserved.

## Run it

You need Python 3.11 or newer, Node 20 or newer, and make. On Debian or Ubuntu, `python3 -m venv` also needs the `python3-venv` package. Docker is optional.

Each `make` target is shown with the commands it runs, if you would rather run them by hand. Run each line on its own, starting from this folder.

`make setup`:

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd frontend && npm install
```

`make run` builds the page and serves it at http://localhost:8000:

```sh
cd frontend && npm run build
cd backend && ../.venv/bin/uvicorn app.main:app --port 8000
```

`make test`:

```sh
.venv/bin/pytest backend/tests
```

For browser tests, install the backend and frontend dependencies above, then run
`npx playwright install chromium` and `npm test` from `frontend/`. This builds
the production interface and runs it against a temporary local backend.
Set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Edge browser instead.

To generate a review, set `OPENAI_API_KEY` in your environment. The default model is
`gpt-5.4`. Optionally set `REVIEW_MODEL` to an OpenAI Chat Completions model with
strict JSON Schema support. From the repository root, run:

```sh
mkdir -p out
./review data/plans/spring-market.md out/spring-market.json
```

Use Git Bash on Windows with a virtual environment at `.venv/Scripts`.
The command reads UTF-8, checks every quotation against the plan, and replaces
the destination only after validation succeeds. A non-zero exit indicates failure.
Any existing destination keeps its previous contents.

The `Dockerfile` builds one container that serves the page and the API on `$PORT`, 8000 by default.

## What we ask

You may change anything, the stack included, as long as the two contracts hold. A good result does this for the events officer:

- **AI.** She can trust the review: it always has the fixed format, and every quote is word for word from the plan. The model proposes and your code decides: an unusable answer is caught and reported, never shown as if it were right.
- **Algorithm.** Any method or library is fine, solvers included. She learns the earliest day the plan can really finish, given its dependencies and that one person does one task at a time, and whether that meets the deadline. Tasks that wait on each other in a circle are named. Show us why we should believe the answer.
- **Backend.** Both contracts hold, bad input gets a clear refusal, and tests show it. Someone else can clone the repo, follow this README and run it.
- **UX.** She opens a plan and sees within seconds whether it can make its date and what is wrong. She can check where each remark comes from in the plan, correct the review when she disagrees, and see what changes. Use `BRAND.md` for the look.

There is more here than fits in two hours. Decide what matters most to her, and say in the note what you cut.

## Rules we check by script

The schedule endpoint and the review command follow two fixed contracts, written out with examples in [docs/contracts.md](docs/contracts.md). In short: at most 60 tasks per request, an answer within 10 seconds, and every quote word for word in the plan. Check your output with:

```sh
python3 check_contract.py schedule <base_url>
python3 check_contract.py review <file.json>
```

This checks the shape and the scheduling rules. It does not check quotes against the plan, or whether your schedule is the shortest. We post our own task lists to your endpoint and compare your end day with the best we know. We run your review command on plans you have not seen. We run `./review` with up to 300 seconds per plan and, if your URL fails, we check your `Dockerfile` with `PORT=8000`.

## Models and AI tools

- Use any model with your own key, live from the app or offline. Your choice; tell us why in the note.
- No key? The assignment also permits OpenRouter, including [nvidia/nemotron-3.5-super-vl:free](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free). Using it would require switching the provider call. The implemented review command uses OpenAI.
- Keep your review outputs for the three sample plans in `data/reviews/`, under the same file names. They are what your `./review` wrote, not edited by hand.
- Name the environment variables your review command needs in the note. If we cannot run your model, we judge the AI part on your code and those outputs.
- How the page uses AI is up to you. We judge it on whether it helps her decide.
- AI coding tools are allowed and expected. Say in the note how you used them and how you checked what they wrote.

## Hand in

You received a zip, so start with `git init` in this folder, commit the starter as it is, then commit as you go; we read the history. Reply to our email with:

1. A link to a git repo we can clone. If it is private, invite both accounts named in the email this zip came with.
2. The URL of your deployed app. Any host works, free tiers included; our script allows a slow first answer from a sleeping host. Keep the URL up for 14 days after you hand in.
3. `NOTES.md`, filled in, in the repo. The note is your chance to explain your choices. Keep it to one page.
