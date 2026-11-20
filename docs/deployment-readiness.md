# Stage 4A deployment decision

**Recommendation, 20 November 2026.** Activate Workers Paid when ready for the hosted trial. The existing Linux/amd64 image serves the complete application. The Containers page for the account containing `nickcloud.dev` showed **Purchase Workers Paid**. Its existing subscriptions do not currently grant Containers access. Wrangler 4.166.0 was available through npm, but its cached OAuth login had expired. A fresh login and a subscription are separate requirements.

## Proposed Cloudflare service

One Worker forwards every path and method to one named Durable Object, which starts the Docker image and forwards HTTP to port 8000. The object uses no application storage. FastAPI serves React, the saved reviews and the existing native solver. The container needs neither outbound Internet access nor a model key. Five idle minutes let a review session reuse its instance before it sleeps. The router probes with HEAD during startup and forwards the user's request once.

The local configuration uses a separate Worker name and contains no account ID, custom-domain binding or DNS route. The eventual hostname is `whitespace.nickcloud.dev`. The remaining hosted verification is to measure the first direct schedule POST after sleep, warm requests and concurrent solves before attaching the hostname. Cloudflare describes cold starts of roughly 1–3 seconds as common, with additional variability from the image and application. Its initial provisioning can also take several minutes. [Getting started](https://developers.cloudflare.com/containers/get-started/) · [Lifecycle](https://developers.cloudflare.com/containers/concepts/architecture/)

## Sizing and measured behaviour

Each row is one sequential local Docker Desktop run with CPU quota, memory limit and swap capped. Startup is elapsed time from launching the cached image to the first successful plan-list response. Warm times include the localhost HTTP round trip. These are observations on one machine, with no cloud network or placement delay.

| Local limits | Startup | Three ordinary 60-task cases | Peak cgroup memory |
|---|---:|---:|---:|
| 1/16 CPU, 256 MiB (Lite equivalent) | 10.43 s | 0.395–1.001 s | 84 MiB |
| 1/4 CPU, 1 GiB (Basic equivalent) | 2.88 s | 0.055–0.203 s | 84 MiB |
| 1 CPU, 512 MiB (proposed custom size) | 1.49 s | 0.020–0.040 s | 85 MiB |

**Basic is the smallest predefined size I would use.** The proposed custom size provides a full CPU, 512 MiB of memory and 2 GB of disk. CPU time is the limiting resource here. Four solver search workers share the available CPU, and simultaneous HTTP requests can compete for it. The eight-second solve budget leaves roughly two seconds for startup, routing and the response. The router sets a nine-second schedule-request timeout. End-to-end latency and optimality within ten seconds cannot be guaranteed for every input. [Instance sizes and limits](https://developers.cloudflare.com/containers/platform/limits/)

At the proposed limits, the three ordinary 60-task cases finished on days 140, 123 and 167. A second 60-task workload combined 12 committee rounds, mandatory officer signoffs and 36 inspections lasting two to six days. Optimality remained unproven at 7.944 s on one CPU and 8.102 s on a quarter CPU. The large-integer fallback also timed out, at 8.022 s on one CPU. Both returned HTTP 503. A feasible finish presented as optimal would give Nora an unsupported decision.

## Cost and fallback

For 14 days, assume four separate sessions a day, five minutes in use and five minutes idle per session, with ten active CPU-seconds per session. That is about 4.7 GiB-hours of memory, 18.7 GB-hours of disk and 9.3 vCPU-minutes. All fit within the monthly Workers Paid container allowances if those allowances are available. The expected charge for a new subscription is **about USD 5 for one billing month**, plus tax where applicable. At published overage rates those container resources themselves cost about **USD 0.06** if all allowances have already been consumed. Worker, Durable Object, logging and egress usage share separate account allowances. [Cloudflare pricing](https://developers.cloudflare.com/containers/platform/pricing/)

Railway is the simplest fallback. A single web service builds the root Dockerfile directly. Leaving serverless sleep disabled avoids wake-up latency. Hobby has a USD 5 monthly minimum applied to usage. Render also accepts the image as one paid web service. Both remove the router and offer an always-on option. Neither removes the solver's proof-time limit. [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles) · [Railway plans](https://docs.railway.com/pricing/plans) · [Railway serverless](https://docs.railway.com/deployments/serverless) · [Render web services](https://render.com/docs/web-services)

## Reproduce locally

The Linux/amd64 image ran Python 3.11.18 and OR-Tools 9.15.6755. With no OpenAI key, a browser opened all three plans, changed Spring Market's finish from day 18 to day 28 and reset it to day 18. Uvicorn listened on `0.0.0.0:8123` with `PORT=8123`. The live schedule contract, three saved-review contracts and all 51 source quotations passed. The full backend suite passed 89 tests on both Windows and Linux, with one test-client deprecation warning. TypeScript, the production build and all eight frontend tests passed.

Run from the repository root with a Linux Docker engine. The alternate port checks that the server honours `PORT`.

```sh
docker build --platform linux/amd64 -t whitespace-plan-reviewer:stage4a .
docker run -d --rm --name whitespace-4a-check --cpus 1 --memory 512m --memory-swap 512m -e PORT=8123 -p 127.0.0.1:18748:8123 whitespace-plan-reviewer:stage4a
python check_contract.py schedule http://127.0.0.1:18748
python scripts/check_readiness.py http://127.0.0.1:18748
docker stop whitespace-4a-check
```

The readiness check verifies the served plan texts and saved JSON against the files, checks every non-null quote, posts the three plans and a correction, and times four ordinary-duration stress workloads plus the large-integer case. A labelled 503 in a stress workload records a failure to prove optimality. Sample plans must succeed and the checks flag requests over ten seconds.

The Worker configuration can be bundled without uploading anything:

```sh
npx --yes wrangler@4.166.0 deploy --dry-run --outdir out/cloudflare
```

Wrangler's native Windows local emulator reported that Containers require WSL. The Linux application, browser workflow and dry-run bundle were verified separately. An actual Cloudflare cold start, Worker-to-container forwarding and the public hostname remain unverified.
