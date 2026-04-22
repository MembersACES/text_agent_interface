import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAutonomousRunnerTriggerBearer,
  postAutonomousRunner,
} from "@/lib/autonomous-runner-trigger";
import { getAutonomousRunnerApiBaseUrl } from "@/lib/utils";

function resolveRunnerBaseUrl(): string | null {
  return getAutonomousRunnerApiBaseUrl();
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ stepId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stepId } = await ctx.params;
    const parsed = Number(stepId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "Invalid step id" }, { status: 400 });
    }

    const bearer = getAutonomousRunnerTriggerBearer();
    if (!bearer) {
      return NextResponse.json(
        {
          error:
            "Runner auth is not configured. Set AUTONOMOUS_RUNNER_API_KEY (recommended) or BACKEND_API_KEY on this service to the exact same value as autonomous_agent_backend's BACKEND_API_KEY (Cloud Run → autonomous service → Variables).",
        },
        { status: 503 },
      );
    }

    const runnerBase = resolveRunnerBaseUrl();
    if (!runnerBase) {
      return NextResponse.json(
        {
          error:
            "Autonomous runner base URL is not configured. Set AUTONOMOUS_RUNNER_API_URL (recommended), AUTONOMOUS_API_URL, or NEXT_PUBLIC_AUTONOMOUS_API_BASE_URL to the service that exposes POST /run/step/{id} (this must not be the CRM monolith).",
        },
        { status: 503 },
      );
    }

    const upstream = await postAutonomousRunner(runnerBase, `/run/step/${parsed}`, bearer);

    if (!upstream.ok) {
      console.error("[autonomous-trigger-step] upstream failure", {
        step_id: parsed,
        runner_base: runnerBase,
        upstream_url: upstream.url,
        status: upstream.status,
        payload: upstream.payload,
      });
      const is401 = upstream.status === 401;
      return NextResponse.json(
        {
          error: is401
            ? "Autonomous runner rejected the bearer token (401). Set interface AUTONOMOUS_RUNNER_API_KEY or BACKEND_API_KEY to match autonomous_agent_backend BACKEND_API_KEY exactly."
            : `Upstream returned ${upstream.status}`,
          upstream_url: upstream.url,
          autonomous_response: upstream.payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(upstream.payload ?? { ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to trigger step";
    console.error("[autonomous-trigger-step] unexpected error", {
      message,
      error,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
