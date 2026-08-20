import { getAutonomousApiBaseUrl } from "@/lib/utils";
import { isSuccessfulWorkerDispatch, workerFailureMessage } from "@/lib/autonomous-runner-trigger";

function apiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (typeof rec.detail === "string" && rec.detail.trim()) return rec.detail;
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
  }
  return fallback;
}

async function markDispatched(
  base: string,
  token: string,
  runId: number,
  stepId: number,
  success: boolean,
  summary: string,
): Promise<void> {
  const res = await fetch(
    `${base}/api/autonomous/sequences/runs/${runId}/steps/${stepId}/mark-dispatched`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ success, summary: summary.slice(0, 4000) }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(apiError(data, "Sent, but the dashboard could not mark the step as done"));
  }
}

export async function dispatchStepNow(opts: {
  runId: number;
  stepId: number;
  token: string;
}): Promise<string> {
  const { runId, stepId, token } = opts;
  const base = getAutonomousApiBaseUrl();

  const res = await fetch(`/api/autonomous/trigger-flows/step/${stepId}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (res.ok && isSuccessfulWorkerDispatch(data)) {
    await markDispatched(base, token, runId, stepId, true, JSON.stringify(data));
    return `Step #${stepId} sent.`;
  }

  const exp = await fetch(
    `${base}/api/autonomous/sequences/runs/${runId}/steps/${stepId}/export-action`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    },
  );
  const exported = await exp.json().catch(() => ({}));
  if (!exp.ok) {
    throw new Error(apiError(exported, workerFailureMessage(data, "Could not load this step to send")));
  }

  const dispatchRes = await fetch("/api/autonomous/trigger-flows/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exported),
  });
  const dispatched = await dispatchRes.json().catch(() => ({}));
  if (dispatchRes.ok && isSuccessfulWorkerDispatch(dispatched)) {
    await markDispatched(base, token, runId, stepId, true, JSON.stringify(dispatched));
    return `Step #${stepId} sent.`;
  }

  const localRes = await fetch(
    `${base}/api/autonomous/sequences/runs/${runId}/steps/${stepId}/execute-now`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    },
  );
  const local = await localRes.json().catch(() => ({}));
  if (!localRes.ok) {
    throw new Error(
      apiError(
        local,
        workerFailureMessage(dispatched, workerFailureMessage(data, "Step was not sent")),
      ),
    );
  }
  return `Step #${stepId} sent.`;
}

export async function dispatchRunNow(opts: {
  runId: number;
  token: string;
  firstReadyStepId?: number | null;
}): Promise<string> {
  const res = await fetch(`/api/autonomous/trigger-flows/run/${opts.runId}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (res.ok && isSuccessfulWorkerDispatch(data)) {
    if (opts.firstReadyStepId) {
      try {
        await markDispatched(
          getAutonomousApiBaseUrl(),
          opts.token,
          opts.runId,
          opts.firstReadyStepId,
          true,
          JSON.stringify(data),
        );
      } catch {
        // Worker already sent; dashboard mark is best-effort.
      }
    }
    return `Sequence #${opts.runId}: first ready step sent.`;
  }
  if (opts.firstReadyStepId) {
    return dispatchStepNow({
      runId: opts.runId,
      stepId: opts.firstReadyStepId,
      token: opts.token,
    });
  }
  throw new Error(workerFailureMessage(data, "No ready step to send"));
}

export async function dispatchRunNowFromList(opts: {
  runId: number;
  token: string;
}): Promise<string> {
  const base = getAutonomousApiBaseUrl();
  const runRes = await fetch(`${base}/api/autonomous/sequences/runs/${opts.runId}`, {
    headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
  });
  const run = await runRes.json().catch(() => ({}));
  if (!runRes.ok) {
    throw new Error(apiError(run, "Could not load this sequence"));
  }
  const steps = Array.isArray((run as { steps?: { id: number; step_status: string }[] }).steps)
    ? (run as { steps: { id: number; step_status: string }[] }).steps
    : [];
  const firstReady = steps.find((s) => s.step_status === "ready" || s.step_status === "to_start");
  return dispatchRunNow({
    runId: opts.runId,
    token: opts.token,
    firstReadyStepId: firstReady?.id ?? null,
  });
}
