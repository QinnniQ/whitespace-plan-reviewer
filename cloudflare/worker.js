import { DurableObject } from "cloudflare:workers";

export default {
  fetch(request, env) {
    return env.REVIEWER.getByName("council").fetch(request);
  },
};

export class PlanReviewer extends DurableObject {
  async waitForApplication() {
    const container = this.ctx.container;
    if (!container.running) {
      container.start({
        image: container.images.base,
        instance: { vcpu: 1, memoryMib: 512, diskMb: 2000 },
        enableInternet: false,
      });
    }
    await container.setInactivityTimeout(5 * 60 * 1000);
    const port = container.getTcpPort(8000);
    const deadline = Date.now() + 8000;
    // Probe the bundled frontend. Retrying the user's POST would repeat a solve.
    while (Date.now() < deadline) {
      try {
        const probe = await port.fetch("http://container/", {
          method: "HEAD", signal: AbortSignal.timeout(500),
        });
        if (probe.ok) return;
      } catch {
        // Python may still be importing its native dependencies.
      }
      await scheduler.wait(100);
    }
    throw new Error("Application startup timed out");
  }

  async fetch(request) {
    const url = new URL(request.url);
    const timedSolve = request.method === "POST" && url.pathname === "/api/schedule";
    try {
      if (!this.ctx.container.running) this.ready = false;
      if (!this.ready) {
        this.starting ??= this.waitForApplication().finally(() => { this.starting = undefined; });
        await this.starting;
        this.ready = true;
      }
      url.protocol = "http:";
      url.host = "container";
      const forwarded = new Request(url, request);
      forwarded.headers.delete("host");
      // A sleeping host may wake slowly. Give the application its full solve budget.
      const signal = timedSolve ? AbortSignal.timeout(9000) : request.signal;
      return await this.ctx.container.getTcpPort(8000).fetch(forwarded, { signal });
    } catch {
      this.ready = false;
      return Response.json({ detail: "The review service is temporarily unavailable. Try again." }, { status: 503 });
    }
  }
}
