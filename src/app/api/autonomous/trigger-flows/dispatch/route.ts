import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAutonomousRunnerTriggerBearer,
  postAutonomousRunner,
} from "@/lib/autonomous-runner-trigger";
import { getAutonomousRunnerApiBaseUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const runnerBase = getAutonomousRunnerApiBaseUrl();
    if (!runnerBase) {
      return NextResponse.json(
        {
          error:
            "Autonomous runner base URL is not configured. Set AUTONOMOUS_RUNNER_API_URL (recommended), AUTONOMOUS_API_URL, or NEXT_PUBLIC_AUTONOMOUS_API_BASE_URL to the service that exposes POST /run/dispatch.",
        },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid action payload" }, { status: 400 });
    }

    const upstream = await postAutonomousRunner(runnerBase, "/run/dispatch", bearer, body);

    if (!upstream.ok) {
      console.error("[autonomous-trigger-dispatch] upstream failure", {
        runner_base: runnerBase,
        upstream_url: upstream.url,
        status: upstream.status,
        payload: upstream.payload,
      });
      if (upstream.status === 401) {
        return NextResponse.json(
          {
            error:
              "Autonomous runner rejected the bearer token (401). Set interface AUTONOMOUS_RUNNER_API_KEY or BACKEND_API_KEY to match autonomous_agent_backend BACKEND_API_KEY exactly.",
            upstream_url: upstream.url,
            autonomous_response: upstream.payload,
          },
          { status: 502 },
        );
      }
      return NextResponse.json(upstream.payload ?? { error: `Upstream returned ${upstream.status}` }, {
        status: upstream.status,
      });
    }

    return NextResponse.json(upstream.payload ?? { ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dispatch action";
    console.error("[autonomous-trigger-dispatch] unexpected error", { message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
