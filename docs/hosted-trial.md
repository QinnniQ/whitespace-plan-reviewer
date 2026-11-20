# Stage 4B hosted trial

**Stage 4B decision B.** Cloudflare ran the full Docker application. Scheduler proof time and compatibility with the assignment checker blocked submission at that stage. The [trial endpoint](https://whitespace-plan-reviewer-trial.nicholai-gay.workers.dev) is available for browser testing.

## Deployment

On 20 November 2026, the account owning `nickcloud.dev` received a new Worker, its Durable Object namespace, one Container application and the application image in its private Cloudflare registry. The active Worker version was `ef1daff1-efbf-4912-996c-d120156d1e3e` at 100% traffic. The running placement in London reported 1 vCPU, 512 MiB, 2 GB disk and the expected image digest `sha256:aa0e620933728d69a0110fa32de1b082a1ce0e4f86f43c72c092589dab3167e7`. This scheduling policy starts the selected image on demand. It has no separate fleet rollout. The trial uses stored reviews with outbound container networking disabled and no OpenAI credential.

Docker's first registry transfers disconnected. BuildKit successfully pushed the same image. Wrangler then received a transient HTTP 404 reading its newly uploaded version. Deploying the now-readable version at 100% completed Container creation, and the trial's `workers.dev` trigger was enabled. The custom domain, DNS and existing applications were untouched.

## Results

| Hosted exercise | Observation |
|---|---|
| Browser and API | Spring Market day 18 against 21, Lantern Festival day 52 against 45, Harbour Run approval–insurance cycle. Increasing Spring's first task by ten days gave day 28 and reset restored day 18. |
| Evidence | All three served plan texts and review JSON files matched the repository. All 51 non-null source quotations matched. |
| Browser checks | Nine Edge tests passed in 16.6 s, including live edits, reset, and a real 422 followed by a successful retry. Other edge-state tests used browser-controlled responses. |
| Local regression | 89 backend tests passed on Windows and in Linux Docker, each with one test-client deprecation warning. TypeScript, Vite production build, nine local Edge tests and three saved-review contract checks passed. |
| Stock schedule checker | Failed with HTTP 403 and Cloudflare error 1010 before reaching the application. The same payload sent by the identified readiness client returned HTTP 200 and the optimal day 9. The assignment checker was unchanged. |
| Startup | The first POST after initial deployment took 14.08 s including 59.77 ms in scheduling. After five idle minutes the instance API confirmed a stopped placement at 20:07:25 UTC. The next POST returned the optimal day 9 in 3.893 s, including 65.38 ms scheduling and 3.83 s outside scheduling. |
| Warm requests | Five plan-list reads took 144–202 ms. Five example POSTs took 114–156 ms including 4.29–6.52 ms in the scheduling function. |
| Concurrency | Three simultaneous 60-task requests returned verified optima of 140, 123 and 167 days. Each took 252–438 ms round trip, including 115–222 ms in scheduling. |
| Utilization | Cloudflare Analytics reported 18 samples from the trial instance through 20:04 UTC, 268 MiB peak memory, 91% peak CPU utilization and 19.6 CPU-seconds. Sampling can miss brief peaks. |

The client measures the full HTTPS exchange. The successful POST's `Server-Timing` header measures model construction, search and schedule assembly in the backend. The difference includes network, routing, queuing, and any wake-up delay.

Cloudflare documents the default Python client restriction on `workers.dev`. Before submission, run the unchanged checker on the intended Worker custom domain. If necessary, limit a Browser Integrity Check exception to that hostname and scheduling path. Railway is the fallback if a compatible Cloudflare hostname cannot be provided. Neither host solves the mathematical cases below. [Cloudflare error 1010](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/)

For four five-minute sessions a day, five idle minutes per session, and ten CPU-seconds per session, 14 days use about 4.7 GiB-hours, 18.7 GB-hours and 9.3 vCPU-minutes. With Workers Paid already active, expected incremental container cost is zero within the shared allowance, or about US$0.06 if it has been used up. Traffic and other account usage can change the bill. [Cloudflare pricing](https://developers.cloudflare.com/containers/platform/pricing/)

## Two reproducible solver limits

The exact API requests are in `backend/tests/fixtures/`. Both returned the backend's explicit HTTP 503. The following comparisons used the production solver locally in a one-CPU, 512-MiB Linux container. Diagnostic changes were confined to those runs.

**Signoffs and inspections** took 8.298 s on Cloudflare. Locally, four search threads found day 150 but proved only 144. One thread found 151 with the same bound. Ordering identical inspections removed some interchangeable choices but still left a six-day proof gap. Giving CP-SAT the independently derived lower bound of 150 closed the proof in 20 ms.

The eleven one-day signoffs separate twelve inspection windows. Each window spans a committee round of at least eleven days. Its inspection load `L` is even, so its length is at least `max(11, L) >= (L + 12) / 2`. Total inspection load is 132. The windows therefore take at least 138 days, the signoffs eleven and closure one, for a lower bound of 150. Six windows can take loads of 6+4, four can take 6+4+2, and two can take six 2-day inspections each. This uses every inspection and attains 150. A focused follow-up should test a generally valid window capacity bound against independent small optima before using it in production.

**Large job shop** took 8.129 s on Cloudflare. Scaling every duration by 10²⁴ exceeds the CP-SAT numeric guard and selects exhaustive order search. The local fallback also timed out. Dividing durations by their common factor gave a CP-SAT proof of 123 units in 71 ms. For any fixed feasible owner order, earliest start times are sums and maxima of durations, so the optimum scales exactly. A focused change can solve in reduced units, restore original integer days and compare against the original deadline. Inputs with no useful common factor still need the existing fallback.

## Reproduce

Run each command with the same public base URL. The readiness client identifies itself separately from the assignment checker. Use `--require-optimal` with the readiness check to treat any stress timeout as a failure.

```sh
python check_contract.py schedule "$URL"
python scripts/check_readiness.py "$URL"
python scripts/measure_latency.py "$URL"
# After five idle minutes, confirm the instance has stopped before sending this POST.
python scripts/measure_latency.py "$URL" --wake
(cd frontend && PLAN_REVIEWER_TEST_URL="$URL" npm test)
```

## Stage 4C local solver follow-up

The two requests were replayed on the committed Stage 4B solver before changing it. Both timed out. The table uses a Linux container limited to one CPU and 512 MiB. Baseline times include the local FastAPI test client. Updated times are medians of five warm loopback HTTP requests. Each updated schedule passed the original response checker.

| Input | Baseline incumbent / proven lower bound | Baseline response | Updated proven finish | Updated response |
|---|---|---|---|---|
| 60 signoff and inspection tasks, 2 named owners, 1–11 days | 150 / 144 days | 503 in 8.053 s | 150 days | 200 in 0.042 s |
| 60 job-shop tasks, 6 owners, 1–20 × 10²⁴ days | 159 / 123, both × 10²⁴ days | 503 in 8.008 s | 123 × 10²⁴ days | 200 in 0.085 s |

**Exact units.** Fix the order of tasks for each owner in any feasible schedule. Adding edges for those orders gives an acyclic graph because every edge advances time. Starting each task as soon as its predecessors finish can only bring the finish forward. Those start times are longest-path sums of durations and hence multiples of their greatest common divisor. An optimal schedule therefore exists in those units, and multiplying back yields a feasible schedule in original days. The solver uses the reduced horizon for its numeric-range check and compares the restored finish with the original deadline.

**A lower bound on completion.** For each task, calculate the longest dependency chain that must still run after it. Tasks with at least `q` days of such work must all finish by overall completion minus `q`. For each distinct `q`, bound the time to finish that group and add `q`. Both the longest path in the group and each owner's total workload give lower bounds.

An owner's tasks on the chosen path partition time into windows before, between and after them. In each window let `h` be the path work that must fit, and `x` the off-path work assigned to that owner in the window. Tasks run without interruption, so `x` is a multiple of the GCD of the owner's off-path durations. The window must last at least `max(h, x)`. Twice this maximum is `h + x + |h − x|`, and the last term is at least the distance from `h` to the nearest multiple of the GCD. Summing over windows gives a lower bound using only path length, total owner workload and those distances. Path tasks assigned to the owner already count in both totals. Taking the integer ceiling preserves the inequality. CP-SAT still has to produce a matching schedule or prove a later optimum within the original eight seconds.

**Remaining limit.** Increasing one task in the large fixture by one day removes the common divisor. Its reduced horizon still exceeds CP-SAT's numeric range. The exact fallback returned 503 in 8.019 s locally. Other combinatorial instances can also exceed the proof budget. The public trial still ran Stage 4B during these local checks.

**Verification.** All 98 backend tests passed on Windows and in the capped Linux container, with one test-client deprecation warning on each. This includes 80 seeded small instances checked by exhaustive enumeration of shorter schedules, and 40 large-unit versions of those instances. The unmodified schedule contract checker and the readiness check with `--require-optimal` both passed against the locally running Docker service. All five 60-task readiness workloads completed.

## Stage 4D custom domain

[WhiteSpace Plan Reviewer](https://whitespace.nickcloud.dev) serves the Stage 4C application from commit `3e0403f`. The existing `whitespace-plan-reviewer-trial` Worker routes both hostnames to the same named Container. Worker version `2137ca4e-ac6d-433e-ae4c-267fa5e52a06` received 100% of traffic. The London placement reported the new image digest `sha256:b99d0746a562cc655395bffcc9755b9eadb6bbb73c049210ecf2b77fb5d87b30`, 1 vCPU, 512 MiB memory and 2 GB disk. The scheduler file in that image matched the checked-out source byte for byte. The image had no OpenAI key.

**Updating this deployment.** Deploy from the repository root with Docker running and an authenticated Wrangler session using `npx wrangler@4.166.0 deploy`. A running Container can continue serving the old digest after Worker activation. In this deployment the previous image returned 503 for the signoff fixture. After five idle minutes, the old instance stopped. On wake, the instance API reported the new digest and both regression fixtures passed. Compare the running digest and execute the strict readiness check before announcing a future update.

**Domain and checker.** The zone DNS inventory, Worker routes, Worker custom domains and Pages projects showed no conflict. Wrangler attached the exact hostname as a Custom Domain. The stock Python client then received Cloudflare 1010. The zone configuration rule `WhiteSpace schedule POST · Browser Integrity Check` disables only Browser Integrity Check when all three terms below match. [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

```text
http.host eq "whitespace.nickcloud.dev" and http.request.uri.path eq "/api/schedule" and http.request.method eq "POST"
```

**Public verification, 20 November 2026**

| Check | Result |
|---|---|
| Original checker | The unchanged `python check_contract.py schedule https://whitespace.nickcloud.dev` passed over HTTPS on Linux and Windows with Python's default client. The checker file matches the assignment baseline. |
| Plans and corrections | Spring Market day 18, edited day 28, reset day 18. Lantern Festival day 52 against day 45. Harbour Run named the circular approval and insurance dependency. All three saved reviews passed the review contract and all 51 source quotations matched. |
| Browser | All nine Edge tests passed on the trial and again on the custom domain, including a real 422 and retry. A separate 390 × 844 touch-viewport run used live responses for plan selection, highlighting, edit and reset, with no page overflow. |
| Difficult schedules | Signoffs finished on day 150 in 405 ms. The scaled job shop finished on day 123 × 10²⁴ in 624 ms. Both responses passed the original scheduling rules. Three simultaneous 60-task job shops returned verified optima in 653–711 ms. |
| Warm timing | Five plan-list reads took 151–203 ms. Five example schedule POSTs took 174–232 ms round trip, including 6.62–10.72 ms in the backend scheduling function. |
| Wake from confirmed sleep | The first example POST returned day 9 in 3.674 s, including 58.51 ms in scheduling. The other 3.62 s included startup, routing, network and response handling. |
| Proof limit | Adding one day to a huge duration removed the common divisor. The public API returned the explicit proof-timeout 503 in 8.185 s. |

Incoming public traffic repeatedly reset the five-minute idle period. A temporary Worker version shortened that interval to 30 seconds on the same Container. Cloudflare reported a stop at 20:55:31 UTC. The five-minute production version was restored to 100% traffic, and the instance still reported `stopped` immediately before the measured POST. The new placement reported the expected digest and running status at 20:55:43 UTC.

Use the public checks in the [README](../README.md). For the browser suite, set `PLAN_REVIEWER_TEST_URL=https://whitespace.nickcloud.dev` and run `npm test` from `frontend/` with the documented browser prerequisites. To repeat the wake measurement, allow five idle minutes, confirm the instance reports `stopped` in Cloudflare and run `python scripts/measure_latency.py https://whitespace.nickcloud.dev --wake` before other traffic reaches the Worker.
