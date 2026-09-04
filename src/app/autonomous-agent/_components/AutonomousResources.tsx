"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
   Autonomous Resources
   In-app reference hub for the Autonomous Agent (follow-up sequencer).
   Content is derived from the `autonomous_agent_backend` codebase and
   `text_agent_backend`, verified against source on 20 Aug 2026.
   Every code reference is given as file:line so it can be checked against the
   repo. Items that could NOT be confirmed in code are flagged inline.
   ──────────────────────────────────────────────────────────────────────────── */

type SectionId =
  | "overview"
  | "create"
  | "system"
  | "lifecycle"
  | "scheduling"
  | "stops"
  | "channels"
  | "drafting"
  | "data"
  | "integrations"
  | "glossary"
  | "messaging"
  | "testing";

interface Section {
  id: SectionId;
  label: string;
  icon: string;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Start here", icon: "🧭" },
  { id: "create", label: "Create, test, edit", icon: "🛠️" },
  { id: "lifecycle", label: "How a sequence runs", icon: "🔁" },
  { id: "scheduling", label: "Scheduling & the cron", icon: "⏰" },
  { id: "stops", label: "Stop conditions", icon: "🛑" },
  { id: "channels", label: "Channels", icon: "📡" },
  { id: "drafting", label: "Drafting & the LLM", icon: "✍️" },
  { id: "data", label: "Data model & timing", icon: "🗂️" },
  { id: "system", label: "System map & endpoints", icon: "🗺️" },
  { id: "integrations", label: "Integrations & env", icon: "🔌" },
  { id: "glossary", label: "Glossary", icon: "📖" },
  { id: "messaging", label: "Comms & talking points", icon: "💬" },
  { id: "testing", label: "QA & testing notes", icon: "🧪" },
];

/* ── small presentational helpers ─────────────────────────────────────────── */

const card =
  "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm";

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(card, "p-5", className)}>{children}</div>;
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 mb-3 last:mb-0">
      {children}
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[12.5px] font-mono text-indigo-700 dark:text-indigo-300">
      {children}
    </code>
  );
}

function Ref({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 align-middle text-[11px] font-mono text-gray-400 dark:text-gray-500">
      {children}
    </span>
  );
}

function Tag({ tone, children }: { tone: "verified" | "flag" | "inferred"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    verified:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    flag: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    inferred:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-[12px] font-mono text-gray-700 dark:text-gray-200">
      {children}
    </span>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "warn" | "info";
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
      : "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30";
  return (
    <div className={cn("rounded-xl border p-4", styles)}>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {tone === "warn" ? "⚠️ " : "ℹ️ "}
        {title}
      </p>
      <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 space-y-2">
        {children}
      </div>
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── section bodies ───────────────────────────────────────────────────────── */

function FlowNode({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 px-3 py-2 text-center font-medium text-gray-800 dark:text-gray-100">
      {children}
    </div>
  );
}

function FlowArrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[11px] font-mono text-gray-400 dark:text-gray-500">
      ▼ {children}
    </div>
  );
}

function Overview() {
  return (
    <div className="space-y-4">
      <Card>
        <H>What this is</H>
        <P>
          After we send a client an energy offer, this agent{" "}
          <strong>automatically follows them up by email, text and phone on a schedule</strong> —
          until they sign or we stop — so sales doesn&rsquo;t have to chase manually. This tab is the
          handbook for how it works and how to use this page.
        </P>
      </Card>

      <Card>
        <H>What you&rsquo;re looking at on this screen</H>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>Running</strong> / <strong>Finished</strong> — live sequence runs, filtered by{" "}
            <Code>run_status</Code> (running vs stopped / completed / cancelled), not by offer CRM
            status.
          </li>
          <li>
            <strong>Sequence templates</strong> — the playbooks: cadence, email/SMS examples, and the
            locked Retell voice agent. <strong>+ New</strong> copies an existing playbook and duplicates
            its Retell agent. Use <strong>Start a test run</strong> there to put a schedule on Running.
          </li>
          <li>
            <strong>Autonomous Resources</strong> — this handbook (you&rsquo;re here).
          </li>
          <li>
            Which tab a run lands in is driven by its <Code>run_status</Code> on{" "}
            <Code>autonomous_sequence_runs</Code>. Offer statuses like Autonomous Agent Trigger exist
            in CRM but are not what this page filters on.
          </li>
        </ul>
      </Card>

      <Card>
        <H>The whole thing in six beats</H>
        <ol className="ml-4 list-decimal space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <li>We hand an offer over to the agent.</li>
          <li>It plans a schedule of touches — a few days, across channels.</li>
          <li>A clock fires every few minutes and asks &ldquo;anything due?&rdquo;</li>
          <li>Before sending, it checks: has the client signed?</li>
          <li>If not, it drafts a personalised message and sends it.</li>
          <li>When they sign, react badly, or the sequence runs out — it stops.</li>
        </ol>
      </Card>

      <Card>
        <H>Where to start, by your job</H>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">🧪 Testing / QA</p>
            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
              Create, test, edit → QA &amp; testing notes → How a sequence runs → Stop conditions.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">💬 Comms / social</p>
            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
              Comms &amp; talking points → Channels → Drafting &amp; the LLM, so the claims you write
              match what it actually does.
            </p>
          </div>
        </div>
      </Card>

      <Callout tone="warn" title="Two things not to break in prod">
        <p>
          <strong>Anything labelled &ldquo;test&rdquo; can be live.</strong> Some test paths actually
          send a real email — treat them carefully. Detail under <strong>System map &amp; endpoints</strong>.
        </p>
        <p>
          <strong>Only one clock should drive sends.</strong> If two schedulers run at once, clients
          get double-messaged. Detail under <strong>System map &amp; endpoints</strong>.
        </p>
      </Callout>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        Ready for the deep end — endpoints, env vars, code paths? Head to{" "}
        <strong>System map &amp; endpoints</strong> and <strong>Integrations &amp; env</strong>.
      </div>
    </div>
  );
}

function CreateLoop() {
  return (
    <div className="space-y-4">
      <Callout tone="info" title="This is the colleague loop">
        <p>
          A new sequence is a playbook (template + its own Retell agent). Creating it does not send
          anything. You still have to start a run, then fire due steps. Do that from this page so you
          can put <strong>your</strong> email and mobile on the run before anything goes out.
        </p>
      </Callout>

      <Card>
        <H>End-to-end from the dashboard</H>
        <ol className="ml-4 list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>Sequence templates → + New.</strong> Pick a comparison that has no sequence yet
            (or a custom key). Copy cadence from a similar template. Leave &ldquo;duplicate Retell
            agent&rdquo; on so this playbook owns its own voice prompt.
          </li>
          <li>
            <strong>Edit the playbook.</strong> Email / SMS examples on the template; voice opening
            line and system prompt on the locked Retell panel. Saving voice writes to Retell, not
            Postgres.
          </li>
          <li>
            <strong>Start a test run</strong> on that same template. Pick a recent offer, then enter{" "}
            <em>your</em> name, email and mobile. That creates a run with a schedule.
          </li>
          <li>
            The run opens under <strong>Running</strong> (schedule of email / SMS / voice steps). Use{" "}
            <strong>Start now</strong> on the list, or open the run and <strong>Send</strong> a single
            step, to fire immediately instead of waiting for the clock.
          </li>
          <li>
            Change the prompt, send again. Stop the run when you are done. If the template is
            Restartable, <strong>Start again</strong> on Finished clones a new schedule from today.
            <strong>Delete sequence</strong> removes the playbook, all runs of that type, and the
            Retell agent if this sequence owns it.
          </li>
        </ol>
      </Card>

      <Card>
        <H>The real comparison path (same sequence type)</H>
        <P>
          Once the template exists and is Active, generating the linked comparison can also start that
          same <Code>sequence_type</Code>. Confirm <strong>Start sequence</strong> after generate — you
          should then see the run on Running, same as the dashboard test.
        </P>
        <SimpleTable
          head={["Comparison", "Sequence type", "Starts a run?"]}
          rows={[
            ["Base 2 C&I Gas / SME→C&I Gas", <Code key="c">gas_base2_followup_v1</Code>, "Yes"],
            ["Base 2 C&I Electricity", <Code key="c">ci_electricity_base2_followup_v1</Code>, "Yes"],
            ["Base 2 B&E Gas", <Code key="c">bne_gas_base2_followup_v1</Code>, "Yes — after you create the template"],
            ["Base 2 Future Contract", <Code key="c">future_gas_base2_followup_v1</Code>, "Yes — after you create the template"],
            ["Utility Invoice Info C&I Electricity", <Code key="c">ci_electricity_offer</Code>, "Yes"],
            ["Solar cleaning quote", <Code key="c">solar_panel_cleaning_followup_v1</Code>, "Yes"],
            ["Engagement form", <Code key="c">solar_panel_cleaning_engagement_form_v1</Code>, "Yes"],
            ["SME electricity, oil, waste, cleaning, GHG", "Catalog suggestions only", "Not yet — use Start a test run"],
          ]}
        />
      </Card>

      <Callout tone="warn" title="What still is not automatic">
        <p>
          <strong>+ New</strong> does not by itself hook a comparison. Base 2 B&E is now wired to{" "}
          <Code>bne_gas_base2_followup_v1</Code> and Future Contract to{" "}
          <Code>future_gas_base2_followup_v1</Code> when those templates exist. Other catalog ideas (SME
          electricity, oil, waste, cleaning, GHG) still need a product start path before generate will
          enrol them. Until then, test those keys with <strong>Start a test run</strong>.
        </p>
      </Callout>
    </div>
  );
}

function SystemMap() {
  const ep: React.ReactNode[][] = [
    [<Pill key="k">worker</Pill>, <Code key="c">POST /run</Code>, <Tag key="t" tone="verified">Bearer</Tag>, "Process ALL due steps — the n8n cron target"],
    [<Pill key="k">worker</Pill>, <Code key="c">POST /run/run/{"{run_id}"}</Code>, <Tag key="t" tone="verified">Bearer</Tag>, "Process due steps for a single run"],
    [<Pill key="k">worker</Pill>, <Code key="c">POST /run/step/{"{step_id}"}</Code>, <Tag key="t" tone="verified">Bearer</Tag>, "Send one step; returns diagnostics if it won’t"],
    [<Pill key="k">worker</Pill>, <Code key="c">POST /retell-webhook/inbound</Code>, <Tag key="t" tone="flag">none</Tag>, "Match caller phone → return offer context to Retell"],
    [<Pill key="k">worker</Pill>, <Code key="c">POST /retell-webhook/end-of-call</Code>, <Tag key="t" tone="flag">none</Tag>, "Save call summary / transcript as run context"],
    [<Pill key="k">worker</Pill>, <Code key="c">GET /test/due</Code>, <Tag key="t" tone="flag">none</Tag>, "Read-only: is each step due now? Sends nothing — QA-safe"],
    [<Pill key="k">worker</Pill>, <Code key="c">GET /test/gmail</Code>, <Tag key="t" tone="flag">none</Tag>, "Which mailbox it reads as / can it see a thread"],
    [<Pill key="k">worker</Pill>, <Code key="c">POST /test/email-graph</Code>, <Tag key="t" tone="flag">none</Tag>, "⚠️ Actually drafts AND sends for a thread"],
    [<Pill key="k">monolith</Pill>, <Code key="c">POST /api/autonomous/sequences/start</Code>, <Tag key="t" tone="verified">app</Tag>, "Create a run + plan its steps"],
    [<Pill key="k">monolith</Pill>, <Code key="c">POST /api/autonomous/internal/tick</Code>, <Tag key="t" tone="verified">auth</Tag>, "Alt dispatcher (also runs in-process every 60s)"],
    [<Pill key="k">monolith</Pill>, <Code key="c">POST /api/autonomous/sequences/inbound</Code>, <Tag key="t" tone="verified">secret hdr</Tag>, "Signed / negative-sentiment / stop signals"],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <H>How the pieces fit</H>
        <P>
          Two Cloud Run services and n8n over one Postgres. n8n is the clock and the mailroom; the{" "}
          <strong>worker</strong> is the brain that drafts and sends; the <strong>monolith</strong>{" "}
          owns the data, plans the steps, and takes the stop signals.
        </P>
        <div className="space-y-1.5 text-sm">
          <FlowNode>⏰ n8n Schedule Trigger — every 5 min</FlowNode>
          <FlowArrow>POST /run · Authorization: Bearer</FlowArrow>
          <FlowNode>🧠 Worker — fetch due → check signed → draft (Gemini) → dispatch</FlowNode>
          <FlowArrow>one message per due step, by channel</FlowArrow>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <FlowNode>📧 Email — n8n webhook</FlowNode>
            <FlowNode>💬 SMS — Twilio</FlowNode>
            <FlowNode>📞 Voice — Retell</FlowNode>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-sm">
          <FlowNode>📥 n8n inbound classifier — signed? negative?</FlowNode>
          <FlowArrow>POST /api/autonomous/sequences/inbound · X-Autonomous-Inbound-Secret</FlowArrow>
          <FlowNode>🗄️ CRM monolith — plans runs/steps · applies stops · /tick</FlowNode>
          <FlowArrow>shared database</FlowArrow>
          <FlowNode>🐘 Postgres — runs · steps · context</FlowNode>
        </div>
      </Card>

      <Card>
        <H>Every endpoint</H>
        <SimpleTable head={["Service", "Method + path", "Auth", "Purpose"]} rows={ep} />
      </Card>

      <Callout tone="warn" title="Security — the worker’s test & webhook routes are unauthenticated">
        <p>
          Only the <Code>/run*</Code> routes carry the <Code>_verify_token</Code> Bearer check. The{" "}
          <Code>/retell-webhook/*</Code> and <Code>/test/*</Code> routes have none — and{" "}
          <Code>POST /test/email-graph</Code> actually drafts and <strong>sends</strong>. On a public{" "}
          <Code>*.run.app</Code> URL, anyone who knows a path can trigger a real send or read your
          mailbox identity. Protect or disable the <Code>/test/*</Code> routes in prod.{" "}
          <Tag tone="flag">action</Tag>
        </p>
      </Callout>

      <Card>
        <H>The n8n workflow</H>
        <P>
          Workflow <strong>&ldquo;Signed Contract Check (Email Text)&rdquo;</strong>: the{" "}
          <Code>Schedule Trigger</Code> (now every 5 min) → an <Code>HTTP Request</Code>{" "}
          <Code>POST …/run</Code> carrying a Bearer credential; the Loop / If / Gmail nodes just
          post-process the response. Separate <Code>Trigger Autonomous Flow</Code>{" "}
          (<Code>aces-autonomous-agent/trigger-flow</Code>) and <Code>Trigger Email</Code> webhooks
          handle ad-hoc runs and inbound replies.
        </P>
        <Callout tone="info" title="Possible redundancy to confirm">
          <p>
            Dispatch can be driven two ways: the n8n cron → worker <Code>/run</Code> (the live path)
            <em>and</em> the monolith&rsquo;s own <Code>/tick</Code> + 60s in-process scheduler.
            Running both would double-drive the same steps — confirm only one is active in prod.{" "}
            <Tag tone="inferred">verify in prod</Tag>
          </p>
        </Callout>
      </Card>
    </div>
  );
}

function Lifecycle() {
  const flow = [
    ["CRON / POST /run", "Invocation starts", "main.py · api.py"],
    ["fetch_due_actions()", "Select steps: status ready + run running + scheduled_at ≤ now", "db.py:242"],
    ["_analyze_email()", "Read Gmail thread; if new client replies, summarise + check signed", "flow.py:105"],
    ["signed? → stop", "If document signed: mark_run_stopped, skip send", "flow.py:111"],
    ["draft + dispatch", "Gemini drafts; send on the step's channel", "flow.py:122"],
    ["mark step", "executed on success, error on failure", "flow.py:183"],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <H>The pipeline, step by step</H>
        <div className="space-y-2">
          {flow.map(([k, v, ref], i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[12px] font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{k}</p>
                <p className="text-[13px] text-gray-600 dark:text-gray-300">{v}</p>
              </div>
              <span className="ml-auto shrink-0 text-[11px] font-mono text-gray-400 dark:text-gray-500">
                {ref}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <H>Statuses you will see</H>
        <P>
          These are the exact values stored in the database and the CRM. A tester should assert
          against these strings, not the display labels.
        </P>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
              Run status <Tag tone="verified">action.py:13</Tag>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Pill>running</Pill>
              <Pill>stopped</Pill>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
              Step status <Tag tone="verified">db.py</Tag>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Pill>ready</Pill>
              <Pill>executed</Pill>
              <Pill>error</Pill>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
              Channel <Tag tone="verified">action.py:18</Tag> / dispatch type{" "}
              <Tag tone="verified">action.py:7</Tag>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Pill>voice_call → phone_call</Pill>
              <Pill>email</Pill>
              <Pill>sms</Pill>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
              Offer status in the CRM <Tag tone="verified">crm.ts:13</Tag>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Pill>requested</Pill>
              <Pill>awaiting_response</Pill>
              <Pill>response_received</Pill>
              <Pill>autonomous_agent_trigger</Pill>
              <Pill>autonomous_agent_stopped</Pill>
              <Pill>accepted</Pill>
              <Pill>lost</Pill>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
              Offer pipeline stage <Tag tone="verified">crm.ts:39</Tag>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Pill>comparison_sent</Pill>
              <Pill>engagement_form_sent</Pill>
              <Pill>engagement_form_signed</Pill>
              <Pill>contract_requested</Pill>
              <Pill>contract_received</Pill>
              <Pill>contract_sent_for_signing</Pill>
              <Pill>contract_signed_lodged</Pill>
              <Pill>contract_accepted</Pill>
              <Pill>lost</Pill>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Scheduling() {
  return (
    <div className="space-y-4">
      <Callout tone="warn" title="Dispatch is poll-driven — the cron cadence IS the punctuality">
        <p>
          Nothing pushes a step out at its scheduled minute. A scheduler polls: &ldquo;anything due
          now?&rdquo; and fires whatever has <Code>scheduled_at ≤ now</Code>. So the poll interval is
          the worst-case lateness of every message. <Tag tone="verified">verified</Tag>
        </p>
      </Callout>

      <Card>
        <H>What a step schedule looks like (the default sequence)</H>
        <P>
          On start, the anchor rolls to its <strong>next business day</strong> (&ldquo;day 1&rdquo;),
          each step adds whole business days (weekends bump to Monday), and the time of day is the
          template&rsquo;s <Code>send_time_local</Code>. The seeded 5-step cadence:{" "}
          <Ref>autonomous_sequence.py:196 · 465</Ref>
        </P>
        <SimpleTable
          head={["Day", "Time (Brisbane)", "Channel"]}
          rows={[
            ["1", <Pill key="a">09:00</Pill>, "email"],
            ["1", <Pill key="b">09:30</Pill>, "voice call"],
            ["2", <Pill key="c">10:00</Pill>, "SMS"],
            ["3", <Pill key="d">11:00</Pill>, "voice call"],
            ["3", <Pill key="e">11:30</Pill>, "email"],
          ]}
        />
        <P>
          Granularity is <strong>the minute</strong> (seconds always 00), weekdays only, and stored
          UTC-naive. The solar engagement-form sequence differs: 3 emails at +2 / +4 / +6 business
          days, all 09:00.
        </P>
        <P>
          Planning uses <Code>run.timezone</Code> first, then the template&rsquo;s timezone, then the
          <Code>AUTONOMOUS_SCHEDULE_TZ</Code> fallback. The dashboard writes{" "}
          <strong>Australia/Brisbane</strong> (UTC+10, no DST) onto new runs, so that is what almost
          everything plans in — but the code fallback is <strong>Australia/Melbourne</strong>, which
          does observe DST. The two are identical from April to October and an hour apart the rest of
          the year, so a run created without an explicit timezone will drift from the rest over
          summer. Worth making the fallback explicit rather than relying on the two agreeing.
        </P>
      </Card>

      <Card>
        <H>What can drive the poll</H>
        <ul className="ml-4 list-disc space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            An <strong>in-process scheduler</strong> in the monolith (APScheduler), default every{" "}
            <Code>60s</Code> (floor 15s), gated by <Code>AUTONOMOUS_SCHEDULER_ENABLED</Code>.
          </li>
          <li>
            An <strong>external cron</strong> calling <Code>POST /api/autonomous/internal/tick</Code>{" "}
            — this is what the <strong>n8n Schedule Trigger</strong> workflow drives.
          </li>
          <li>
            The dashboard&rsquo;s &ldquo;Trigger Autonomous Flows&rdquo; button posts to an{" "}
            <strong>n8n webhook</strong> that is meant to kick the same due-step poll. Per-run{" "}
            <strong>Start now</strong> / per-step <strong>Send</strong> call the worker{" "}
            <Code>POST /run/run/{"{id}"}</Code> and <Code>POST /run/step/{"{id}"}</Code> via the
            dashboard&rsquo;s trigger-flows routes.
          </li>
        </ul>
      </Card>

      <Card>
        <H>The seeded sequence types</H>
        <P>
          Five templates ship by default; staff can add more via Sequence templates (+ New copies
          cadence and can duplicate a Retell agent). All but the engagement form use the standard
          5-step cadence above. Base 2 B&amp;E Gas and Future Contract are not seeded — create{" "}
          <Code>bne_gas_base2_followup_v1</Code> or <Code>future_gas_base2_followup_v1</Code> in the
          wizard, then generate or Start a test run.
        </P>
        <SimpleTable
          head={["Sequence type", "Steps", "Cadence"]}
          rows={[
            [<Code key="c">gas_base2_followup_v1</Code>, "5", "Standard (Day 1–3)"],
            [<Code key="c">ci_electricity_base2_followup_v1</Code>, "5", "Standard (Day 1–3)"],
            [<Code key="c">ci_electricity_offer</Code>, "5", "Standard (Day 1–3)"],
            [<Code key="c">bne_gas_base2_followup_v1</Code>, "5", "Standard — create via + New, then Base 2 B&E or test run"],
            [<Code key="c">future_gas_base2_followup_v1</Code>, "5", "Standard — create via + New, then Base 2 Future Contract or test run"],
            [<Code key="c">solar_panel_cleaning_followup_v1</Code>, "5", "Standard (Day 1–3)"],
            [
              <Code key="c">solar_panel_cleaning_engagement_form_v1</Code>,
              "3",
              "3 emails, +2 / +4 / +6 business days at 09:00 · not restartable",
            ],
          ]}
        />
      </Card>

      <Callout tone="warn" title="Current n8n cron: half-hourly — aligned by luck, not design">
        <p>
          Verified from Cloud Run logs on 28 Aug 2026: n8n posts to <Code>/run</Code> at :00 and :30
          past the hour. An earlier version of this page said &ldquo;once a day at 09:00&rdquo; —
          that was out of date. With steps due at 09:30, 10:00, 11:00 and 11:30 the half-hourly poll
          happens to line up, but only because every template currently uses on-the-hour and
          on-the-half-hour times.
        </p>
        <p>
          That alignment is fragile. Edit one template to an off-:30 minute — 09:15, say — and the
          step waits up to 29 minutes. The safer fix is an interval poll of{" "}
          <strong>every 1–5 minutes</strong> (the design default is 60s). Empty polls are cheap — a
          DB query that finds nothing due. Once you poll on an interval, the trigger&rsquo;s own
          timezone (Perth) stops gating anything.
        </p>
      </Callout>
    </div>
  );
}

function Stops() {
  return (
    <div className="space-y-4">
      <Callout tone="info" title="Two stop mechanisms — and yes, negative sentiment is one">
        <p>
          A run stops on a <strong>signed document/agreement</strong> or on{" "}
          <strong>negative sentiment</strong>, detected in two places: the worker&rsquo;s pre-send LLM
          check (signed only), and the monolith&rsquo;s inbound webhook (signed, sentiment, or
          manual). <Tag tone="verified">verified</Tag>
        </p>
        <p>
          Nuance for testers and writers: the <em>sentiment decision is made upstream</em> (an n8n
          classifier) and posted in as a boolean — there is no sentiment threshold or scoring in the
          backend itself.
        </p>
      </Callout>

      <Card>
        <H>Stop 1 — document signed (worker pre-send check)</H>
        <P>
          Before every step is sent, the worker reads the client email thread and — only if the client
          has replied since the last check — asks the LLM: has the prospect signed and returned the
          contract or engagement form? <Ref>flow.py:90 · email_analysis_agent.py:22</Ref>
        </P>
        <P>
          If <Code>is_document_signed</Code> is true, it logs &ldquo;Document signed — stopping
          sequence&rdquo;, calls <Code>mark_run_stopped(run_id)</Code>, and returns without sending.{" "}
          <Ref>flow.py:111 · db.py:84</Ref> A boolean from the model — no numeric threshold.{" "}
          <Tag tone="verified">verified</Tag>
        </P>
      </Card>

      <Card>
        <H>Stop 2 — the inbound webhook (CRM monolith)</H>
        <P>
          n8n posts client signals to <Code>POST /api/autonomous/sequences/inbound</Code> (guarded by
          an <Code>X-Autonomous-Inbound-Secret</Code> header). <Code>apply_inbound()</Code> sets a stop
          reason and skips the remaining steps: <Ref>autonomous_sequence.py:1049</Ref>
        </P>
        <SimpleTable
          head={["Incoming signal", "stop_reason"]}
          rows={[
            [
              <span key="a">
                <Code>agreement_signed</Code> true, or <Code>intent = agreement_signed</Code>
              </span>,
              <Pill key="a2">agreement_signed</Pill>,
            ],
            [
              <span key="b">
                <Code>sentiment_negative</Code> true, or <Code>intent = stop / stop_sentiment</Code>
              </span>,
              <Pill key="b2">negative_sentiment_stop</Pill>,
            ],
            [<span key="c">Dashboard &ldquo;Stop&rdquo; button</span>, <Pill key="c2">manual_stop</Pill>],
          ]}
        />
        <P>
          As a belt-and-braces check, <Code>_should_stop_run()</Code> re-queries for those stop events
          before executing any due step, so a signal that lands mid-sequence still halts it.{" "}
          <Ref>autonomous_sequence.py:910</Ref>
        </P>
      </Card>

      <Card>
        <H>“Won&rsquo;t send” reasons (not the same as a stop)</H>
        <P>
          A step can simply fail to dispatch without stopping the run. <Code>diagnose_step</Code>{" "}
          enumerates why <Ref>db.py:204</Ref>:
        </P>
        <div className="flex flex-wrap gap-1.5">
          <Pill>RUN_NOT_RUNNING</Pill>
          <Pill>STEP_STATUS_NOT_READY</Pill>
          <Pill>NO_CONTACT_EMAIL</Pill>
          <Pill>NO_CONTACT_PHONE</Pill>
          <Pill>UNKNOWN_CHANNEL_OR_DISPATCH_ERROR</Pill>
        </div>
      </Card>

      <Callout tone="info" title="An unused “signed” webhook exists">
        <p>
          <Code>.env.example</Code> defines <Code>N8N_DOCUMENT_WEBHOOK_URL</Code> pointing at a{" "}
          <Code>find-email-signed</Code> n8n flow, but no code in the runner references it. The live
          signed-detection path is the Gmail + LLM check above. <Tag tone="verified">verified</Tag>
        </p>
      </Callout>
    </div>
  );
}

function Channels() {
  return (
    <div className="space-y-4">
      <P>
        The channel is chosen per step. Dispatch branches on the action type{" "}
        <Ref>flow.py:122</Ref>; the DB <Code>channel</Code> value maps to it <Ref>db.py:284</Ref>.
      </P>

      <Card className="border-l-4 border-l-indigo-500">
        <H>📧 Email — via n8n webhook</H>
        <P>
          The runner does not talk to a mail server directly. It POSTs the drafted email as JSON to
          an n8n webhook, which owns the mailbox and sends it.
        </P>
        <SimpleTable
          head={["Aspect", "Detail"]}
          rows={[
            ["Service", <Code key="s">services/email.py — EmailService.send()</Code>],
            ["Path", <span key="p">LangGraph <Code>EmailGraph.run()</Code> → <Code>EmailAgent</Code> draft → send <Ref>email_graph.py:90</Ref></span>],
            ["Payload", <Code key="pl">{`{ to, subject, body_html, body_text, message_id }`}</Code>],
            ["Threading", <span key="t">Replies thread onto the last message via <Code>message_id</Code> <Ref>email_graph.py:123</Ref></span>],
            ["Signature", <span key="sig">HTML signature appended if <Code>signature_html</Code> is set and the body does not already contain <Code>acesolutions.com.au</Code> <Ref>email_graph.py:96</Ref></span>],
            ["Config", <Code key="c">N8N_EMAIL_WEBHOOK_URL</Code>],
          ]}
        />
      </Card>

      <Card className="border-l-4 border-l-indigo-500">
        <H>💬 SMS — via Twilio</H>
        <SimpleTable
          head={["Aspect", "Detail"]}
          rows={[
            ["Service", <Code key="s">services/sms.py — SMSService.send()</Code>],
            ["Call", <Code key="c">client.messages.create(body, from_, to)</Code>],
            ["Draft", <span key="d">A single SMS ≤ 160 characters prompting a reply or call booking <Ref>sms_agent.py:14</Ref></span>],
            ["Returns", <span key="r">The Twilio message SID</span>],
            ["Config", <span key="cf"><Code>TWILIO_ACCOUNT_SID</Code>, <Code>TWILIO_AUTH_TOKEN</Code>, <Code>TWILIO_FROM_NUMBER</Code> (E.164)</span>],
          ]}
        />
      </Card>

      <Card className="border-l-4 border-l-indigo-500">
        <H>📞 Voice — via RetellAI</H>
        <P>
          Outbound calls are placed through Retell with the offer&rsquo;s numbers passed as dynamic
          variables so the voice agent can speak the specifics.
        </P>
        <SimpleTable
          head={["Aspect", "Detail"]}
          rows={[
            ["Service", <Code key="s">services/phone.py — CallService.trigger()</Code>],
            ["Call", <Code key="c">client.call.create_phone_call(...)</Code>],
            ["Agent id", <span key="a">Per-step <Code>retell_agent_id</Code> → sequence-type config → default <Code>RETELL_AGENT_ID</Code> <Ref>db.py:307 · phone.py:16</Ref></span>],
            ["Dynamic vars", <span key="d">Offer / savings figures built by <Code>_build_dynamic_variables</Code> <Ref>db.py:369</Ref></span>],
            ["Metadata", <Code key="m">{`{ run_id }`}</Code>],
            ["Inbound", <span key="i"><Code>POST /retell-webhook/inbound</Code> matches a running run by caller phone and returns the agent + context <Ref>api.py:78</Ref></span>],
            ["End of call", <span key="e"><Code>call_analyzed</Code> events save the summary/transcript as run context <Ref>api.py:113</Ref></span>],
            ["Config", <span key="cf"><Code>RETELL_API_KEY</Code>, <Code>RETELL_AGENT_ID</Code>, <Code>RETELL_FROM_NUMBER</Code> (E.164)</span>],
          ]}
        />
      </Card>
    </div>
  );
}

function Drafting() {
  return (
    <div className="space-y-4">
      <Callout tone="warn" title="Live model differs from the docs">
        <p>
          The code hardcodes <Code>gemini-3-flash-preview</Code> <Ref>agents/agent.py:9</Ref>. The
          backend <Code>CLAUDE.md</Code> / <Code>.env.example</Code> still say{" "}
          <Code>gemini-2.0-flash</Code>, and there is no <Code>GEMINI_MODEL</Code> setting — the
          model is not runtime-configurable. Trust the code. <Tag tone="verified">verified</Tag>
        </p>
      </Callout>

      <Card>
        <H>How drafts are produced</H>
        <P>
          All three agents (email, SMS, analysis) share one base <Code>Agent</Code> wrapping{" "}
          <Code>ChatGoogleGenerativeAI</Code> with structured output. <Ref>agents/agent.py</Ref>
        </P>
        <P>
          Each sequence type carries its own prompt configuration in the DB —{" "}
          <Code>email_system_prompt</Code>, <Code>email_example</Code>,{" "}
          <Code>sms_system_prompt</Code>, <Code>sms_example</Code> and a <Code>retell_agent_id</Code>{" "}
          (<Code>AutonomousSequenceType</Code> <Ref>db/models.py:22</Ref>). These feed the drafting
          agents as the system prompt and a worked example — this is the backend side of the
          &ldquo;Sequence templates&rdquo; tab.
        </P>
      </Card>

      <Card>
        <H>Guardrails baked into the email prompt</H>
        <ul className="ml-4 list-disc space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <li>Body kept under ~200 words before the signature. <Ref>email_agent.py</Ref></li>
          <li>
            <strong>Never invents numbers.</strong> Only uses figures present in the offer context.
          </li>
          <li>
            Savings rules: whole-of-term figures (<Code>contract_savings</Code>,{" "}
            <Code>total_savings</Code>, <Code>offer_term_savings</Code>) are led with as-is and never
            multiplied by term years; <Code>annual_savings</Code> is treated as an approximate yearly
            number.
          </li>
          <li>
            Validity rules: uses <Code>validity_date</Code> / <Code>offer_validity_label</Code>, and
            honours an <Code>omit_validity</Code> flag.
          </li>
          <li>Short sign-off only — it does not invent a personal sender name.</li>
        </ul>
      </Card>

      <Card>
        <H>Analysis agent</H>
        <P>
          Returns two things from the thread: <Code>is_document_signed</Code> (the stop signal) and a
          2–3 sentence <Code>email_context</Code> summary that is stored and folded into the next
          follow-up so replies feel informed. Thread text is truncated to 2000 chars per message.{" "}
          <Ref>email_analysis_agent.py</Ref>
        </P>
      </Card>
    </div>
  );
}

function DataModel() {
  return (
    <div className="space-y-4">
      <Card>
        <H>The four tables</H>
        <SimpleTable
          head={["Table", "What it holds", "Key fields"]}
          rows={[
            [
              <Code key="t">autonomous_sequence_runs</Code>,
              "One row per offer being worked",
              <span key="f">
                <Code>run_status</Code>, <Code>offer_id</Code>, <Code>context_json</Code>,{" "}
                <Code>sequence_type</Code>, <Code>email_id</Code> (Gmail thread),{" "}
                <Code>contact_email/phone/name</Code>, <Code>validity_date</Code>
              </span>,
            ],
            [
              <Code key="t">autonomous_sequence_steps</Code>,
              "The ordered outreach steps",
              <span key="f">
                <Code>step_index</Code>, <Code>channel</Code>, <Code>step_status</Code>,{" "}
                <Code>scheduled_at</Code>, <Code>completed_at</Code>, <Code>retell_agent_id</Code>
              </span>,
            ],
            [
              <Code key="t">autonomous_sequence_context</Code>,
              "Accumulated context from replies & calls",
              <span key="f">
                unique on <Code>(run_id, source, source_id)</Code>; <Code>source</Code> ∈ email, call
              </span>,
            ],
            [
              <Code key="t">autonomous_sequence_type</Code>,
              "Per-type prompts & voice agent",
              <span key="f">
                <Code>email_system_prompt</Code>, <Code>sms_system_prompt</Code>, examples,{" "}
                <Code>retell_agent_id</Code>
              </span>,
            ],
          ]}
        />
        <p className="mt-2 text-[12px] font-mono text-gray-400 dark:text-gray-500">
          src/db/models.py
        </p>
      </Card>

      <Card>
        <H>Timing &amp; the &ldquo;anchor&rdquo;</H>
        <P>
          A step becomes due when it is <Pill>ready</Pill>, its run is <Pill>running</Pill>, and its{" "}
          <Code>scheduled_at</Code> is at or before now — evaluated in{" "}
          <strong>Australia/Brisbane</strong> time. Steps fire in <Code>scheduled_at</Code> order.{" "}
          <Ref>db.py:242 · db.py:350</Ref>
        </P>
        <Callout tone="info" title="How the anchor actually works">
          <p>
            The run stores an <Code>anchor_at</Code>; each step&rsquo;s <Code>scheduled_at</Code> = the
            anchor&rsquo;s <strong>next business day</strong> + <Code>(day_number − 1)</Code> business
            days (weekends bumped to Monday) at the template&rsquo;s <Code>send_time_local</Code>,
            computed in Australia/Brisbane and stored UTC-naive.{" "}
            <Ref>autonomous_sequence.py:196</Ref> See <strong>Scheduling &amp; the cron</strong> for the
            default times and poll cadence. <Tag tone="verified">verified</Tag>
          </p>
        </Callout>
        <P>
          Offer validity is shown to clients from a friendly <Code>offer_validity_label</Code> when
          present, falling back to formatting <Code>validity_date</Code> as{" "}
          <Code>dd/mm/YYYY (12pm)</Code> in Brisbane time — deliberately, to avoid a timezone-shifted
          &ldquo;10:00 AM&rdquo; bug. <Ref>db.py:263</Ref>
        </P>
      </Card>
    </div>
  );
}

function Integrations() {
  const rows: React.ReactNode[][] = [
    [<Code key="v">DATABASE_URL</Code>, "PostgreSQL — the shared DB holding runs, steps, context"],
    [<Code key="v">BACKEND_API_KEY</Code>, "Bearer token for the FastAPI routes; auth is off if empty"],
    [<Code key="v">N8N_EMAIL_WEBHOOK_URL</Code>, "n8n webhook that actually sends the email"],
    [<Code key="v">N8N_DOCUMENT_WEBHOOK_URL</Code>, "n8n find-email-signed webhook (in env, unused by the runner)"],
    [<Code key="v">GMAIL_SERVICE_ACCOUNT_JSON</Code>, "Service-account creds to read Gmail threads for analysis"],
    [<Code key="v">GMAIL_DELEGATED_USER</Code>, "Mailbox the service account impersonates"],
    [<Code key="v">TWILIO_ACCOUNT_SID</Code>, "Twilio account SID"],
    [<Code key="v">TWILIO_AUTH_TOKEN</Code>, "Twilio auth token"],
    [<Code key="v">TWILIO_FROM_NUMBER</Code>, "Twilio SMS sender, E.164"],
    [<Code key="v">RETELL_API_KEY</Code>, "RetellAI API key"],
    [<Code key="v">RETELL_AGENT_ID</Code>, "Default Retell voice agent id (fallback)"],
    [<Code key="v">RETELL_FROM_NUMBER</Code>, "Retell caller number, E.164"],
    [<Code key="v">GOOGLE_API_KEY</Code>, "Google Generative AI (Gemini) key for drafting"],
    [<Code key="v">LANGSMITH_TRACING</Code>, "Enable LangSmith tracing (default off)"],
    [<Code key="v">LANGSMITH_API_KEY</Code>, "LangSmith API key"],
    [<Code key="v">LANGSMITH_PROJECT</Code>, "LangSmith project name (default: default)"],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <H>External services</H>
        <div className="flex flex-wrap gap-1.5">
          <Pill>PostgreSQL</Pill>
          <Pill>n8n cloud (email)</Pill>
          <Pill>Twilio (SMS)</Pill>
          <Pill>RetellAI (voice)</Pill>
          <Pill>Gmail API (service account)</Pill>
          <Pill>Google Gemini (drafting)</Pill>
          <Pill>LangSmith (optional tracing)</Pill>
        </div>
      </Card>
      <Card>
        <H>Environment variables</H>
        <SimpleTable head={["Variable", "Purpose"]} rows={rows} />
        <p className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
          Source: <span className="font-mono">src/config/settings.py</span> +{" "}
          <span className="font-mono">.env.example</span>. Note the Gmail, Google and LangSmith vars
          live in <span className="font-mono">settings.py</span> only, not{" "}
          <span className="font-mono">.env.example</span>.
        </p>
      </Card>

      <Card>
        <H>Monolith settings (text_agent_backend)</H>
        <SimpleTable
          head={["Variable", "Purpose"]}
          rows={[
            [<Code key="v">AUTONOMOUS_SCHEDULER_ENABLED</Code>, "Turns on the in-process 60s dispatcher (default off)"],
            [<Code key="v">AUTONOMOUS_SCHEDULER_INTERVAL_SECONDS</Code>, "Poll interval for that scheduler (default 60, floor 15)"],
            [<Code key="v">AUTONOMOUS_SCHEDULE_TZ</Code>, "Planning-timezone fallback, used only when the run and template have none. NOT an env var — a Python constant, currently Australia/Melbourne. New runs from the dashboard carry Australia/Brisbane instead."],
            [<Code key="v">N8N_AUTONOMOUS_EMAIL_WEBHOOK_URL</Code>, "n8n send-email webhook (monolith path)"],
            [<Code key="v">N8N_AUTONOMOUS_SMS_WEBHOOK_URL</Code>, "n8n send-SMS webhook (monolith path)"],
            [<Code key="v">N8N_AUTONOMOUS_ENGAGEMENT_FORM_WEBHOOK_URL</Code>, "n8n engagement-form generation webhook"],
            [<Code key="v">X-Autonomous-Inbound-Secret</Code>, "Header secret guarding the inbound stop webhook"],
          ]}
        />
        <p className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
          Source: <span className="font-mono">services/autonomous_sequence.py</span> ·{" "}
          <span className="font-mono">main.py</span>.
        </p>
      </Card>
    </div>
  );
}

function Glossary() {
  const terms: [string, React.ReactNode, "verified" | "inferred"][] = [
    ["Run", <>One autonomous sequence for one offer (<Code>autonomous_sequence_runs</Code>).</>, "verified"],
    ["Step", <>One scheduled outreach within a run, on one channel (<Code>autonomous_sequence_steps</Code>).</>, "verified"],
    ["Anchor", <>The run&rsquo;s <Code>anchor_at</Code>; step times are offset from its next business day (Brisbane) — see Scheduling. <Code>scheduled_at</Code> is stored UTC-naive.</>, "verified"],
    ["EF — Engagement Form", <>A document the client signs to engage the service; a distinct pipeline stage (<Code>engagement_form_signed</Code>). &ldquo;Signed EF&rdquo; maps to the signed-document stop.</>, "inferred"],
    ["LOA — Letter of Authority", <>Authorises the provider to act on the client&rsquo;s utility accounts (CRM activity <Code>loa</Code>).</>, "inferred"],
    ["EOI", <>Expression of Interest (CRM activity <Code>eoi</Code>).</>, "inferred"],
    ["Comparison snapshot", <>The offer/savings figures (current cost, annual/contract savings, term) flattened into email, SMS and voice variables.</>, "verified"],
    ["Base 1 / Base 2 review", <>Utility-bill analyses; Base 1 is the public lead-magnet, Base 2 a deeper review (CRM activity <Code>base2_review</Code>).</>, "inferred"],
    ["GHG offer", <>Greenhouse-gas / carbon offer, consistent with the Carbon Zero brand (CRM activity <Code>ghg_offer</Code>).</>, "inferred"],
    ["NMI", <>National Metering Identifier — an electricity meter&rsquo;s unique id. Referenced in the CRM, not the runner.</>, "inferred"],
  ];
  return (
    <Card>
      <H>Glossary</H>
      <dl className="divide-y divide-gray-100 dark:divide-gray-800">
        {terms.map(([t, d, tone], i) => (
          <div key={i} className="py-2.5">
            <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t} <Tag tone={tone}>{tone}</Tag>
            </dt>
            <dd className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{d}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Messaging() {
  return (
    <div className="space-y-4">
      <Callout tone="info" title="For the testimonial / promo writer">
        <p>
          These talking points are derived from what the system actually does. They are safe,
          generic messaging — but verify any client-specific number or outcome against the real offer
          before publishing.
        </p>
      </Callout>
      <Card>
        <H>What it does, in plain English</H>
        <ul className="ml-4 list-disc space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>Follows up so the team doesn&rsquo;t have to.</strong> Every offer gets a
            consistent, multi-touch follow-up across email, text and phone — automatically, on
            schedule.
          </li>
          <li>
            <strong>Personalised, not spammy.</strong> Each message is written by AI from the
            client&rsquo;s own offer figures, and it is instructed never to invent numbers.
          </li>
          <li>
            <strong>Knows when to stop.</strong> The moment a client signs, the sequence halts on its
            own — no awkward &ldquo;did you sign yet?&rdquo; after the deal is done.
          </li>
          <li>
            <strong>Reads replies.</strong> When a client emails back, the agent summarises the reply
            and folds it into the next message so the conversation stays coherent.
          </li>
          <li>
            <strong>Talks, literally.</strong> It can place real phone calls with a voice agent that
            already knows the offer details, and it handles inbound calls too.
          </li>
          <li>
            <strong>Runs unattended.</strong> The whole thing fires on a schedule — the sales team
            wakes up to progress, not a to-do list.
          </li>
        </ul>
      </Card>
      <Card>
        <H>Claims to avoid / handle with care</H>
        <ul className="ml-4 list-disc space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            It <strong>does</strong> stop on a signed agreement and on negative sentiment — but the
            sentiment call is made by an upstream classifier, so frame it as &ldquo;backs off when a
            client reacts badly&rdquo;, not as a precise emotion score.
          </li>
          <li>Do not quote a specific model name in marketing; it changes and is an internal detail.</li>
          <li>Savings figures are whole-of-term or annual depending on the offer — never multiply them yourself.</li>
        </ul>
      </Card>
    </div>
  );
}

function Testing() {
  return (
    <div className="space-y-4">
      <Callout tone="info" title="For the QA / tester">
        <p>
          The highest-value tests target the selection logic, the stop path, and correct
          status-marking. Assert on the raw string values in the Statuses section, and remember all
          time comparisons are in Australia/Brisbane.
        </p>
      </Callout>
      <Card className="border-l-4 border-l-amber-500">
        <H>How to run a safe test (dashboard first)</H>
        <P>
          The golden rule: <strong>put your own email and phone in before anything sends</strong>, so
          the follow-up chases <em>you</em>, not the client.
        </P>
        <ol className="ml-4 list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            Open <strong>Sequence templates</strong>, select the playbook (e.g. B&amp;E Gas Base 2
            Follow-up), edit prompts if needed, then <strong>Start a test run</strong>. Pick any recent
            offer and enter <strong>your</strong> email and mobile.
          </li>
          <li>
            You land on the run schedule. Steps sit as <Code>ready</Code> until due. Use{" "}
            <strong>Start now</strong> / <strong>Send</strong> to fire a step immediately to those test
            contacts.
          </li>
          <li>
            Change the Retell or email prompt on the template, send again. Stop when finished;{" "}
            <strong>Start again</strong> on Finished if the template is restartable.
          </li>
          <li>
            Optional product path: generate the linked comparison (Base 2 B&amp;E Gas and Future
            Contract now offer Start sequence for <Code>bne_gas_base2_followup_v1</Code> /{" "}
            <Code>future_gas_base2_followup_v1</Code>). Put your mobile on the generate form so voice
            does not dial the member.
          </li>
        </ol>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <H>Older path: Frankston RSL</H>
        <P>
          The golden rule: <strong>put your own email and phone in before anything sends</strong>, so
          the follow-up chases <em>you</em>, not the client. Where you do that depends on the path —
          and the RSL path is the safe one.
        </P>
        <ol className="ml-4 list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            Open <strong>Frankston</strong> (an RSL member) in the CRM and run a <strong>Base 2</strong>{" "}
            comparison, then start the <strong>RSL follow-up</strong>.
          </li>
          <li>
            The <strong>&ldquo;RSL follow-up contact&rdquo;</strong> modal appears{" "}
            <em>before anything goes out</em>. It even says &ldquo;for testing, enter your own phone and
            email so nothing goes live to the client.&rdquo; Put <strong>your own email and mobile
            (04…)</strong> here — that phone is the number the voice agent calls — then{" "}
            <strong>Confirm &amp; enrol</strong>.
          </li>
          <li>
            Watch the run under <strong>Running</strong>. Steps fire on their own schedule; use{" "}
            <strong>Trigger Autonomous Flows</strong> only when you want the due steps to go now — to
            your redirected contact.
          </li>
        </ol>
        <Callout tone="warn" title="The trap: the same-titled modal behaves differently by path">
          <p>
            On a plain <strong>Comparison</strong> or <strong>DMA</strong> send, the recipient modal
            edits <strong>name and email only — no phone field</strong>, and Base 2&rsquo;s{" "}
            <strong>&ldquo;Start autonomous follow-up?&rdquo;</strong> modal is just{" "}
            <strong>Start / Not now</strong> with no contact fields. So on those Base 2 paths the voice
            step can still dial the client&rsquo;s real number — use the RSL path above, or set the
            member&rsquo;s phone on record to a test number first.
          </p>
          <p>
            The exception worth knowing: the <strong>C&amp;I electricity Info tool</strong> path (open a
            member from Utilities → C&amp;I electricity) shows a modal with the <em>same</em> title that{" "}
            <strong>does</strong> let you edit business, name, email and <strong>mobile (04…)</strong>{" "}
            before it starts <Code>ci_electricity_offer</Code> — so you can safely redirect there. Just
            don&rsquo;t assume that behaviour on Base 2.
          </p>
        </Callout>
        <P>
          And never point <strong>Trigger Autonomous Flows</strong> (or <Code>POST /run</Code>) at a
          run that still holds the real client&rsquo;s contact — that is exactly what makes it go live.
        </P>
      </Card>

      <Card>
        <H>Suggested test surface</H>
        <ul className="ml-4 list-disc space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>Due-step selection.</strong> A step fires only when{" "}
            <Code>ready</Code> + run <Code>running</Code> + <Code>scheduled_at ≤ now</Code> (Brisbane).
            Test the boundary at exactly now, and a future <Code>scheduled_at</Code>.
          </li>
          <li>
            <strong>Signed-document stop.</strong> A thread that looks signed → run goes{" "}
            <Code>stopped</Code>, no send. A thread with no new client reply → no analysis, still
            sends.
          </li>
          <li>
            <strong>Status marking.</strong> Successful send → <Code>executed</Code> +{" "}
            <Code>completed_at</Code>; a raised error → <Code>error</Code> + <Code>completed_at</Code>.
          </li>
          <li>
            <strong>Channel dispatch.</strong> email → n8n payload shape; sms → ≤160 chars + returns a
            SID; phone → Retell agent-id fallback order and dynamic variables present.
          </li>
          <li>
            <strong>Email threading &amp; signature.</strong> <Code>message_id</Code> is passed;
            signature appended only when missing and <Code>signature_html</Code> present.
          </li>
          <li>
            <strong>diagnose_step.</strong> Each non-dispatch reason returns the right enum (missing
            email/phone, wrong status, run not running).
          </li>
          <li>
            <strong>Per-type prompts.</strong> A run&rsquo;s <Code>sequence_type</Code> config prompt
            actually reaches the drafting agent.
          </li>
        </ul>
      </Card>
      <Card>
        <H>Manual trigger &amp; inspect recipes</H>
        <P>Concrete calls for exercising the system by hand. Keep secrets in env — never inline.</P>
        <ul className="ml-4 list-disc space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>Inspect due-ness (sends nothing):</strong>{" "}
            <Code>GET /test/due?run_id=123</Code> lists each step&rsquo;s stored time vs Brisbane-now
            and <Code>is_due_now</Code>; <Code>GET /test/gmail?thread_id=…</Code> confirms the mailbox.
          </li>
          <li>
            <strong>Drive dispatch:</strong> <Code>POST /run</Code> with{" "}
            <Code>Authorization: Bearer $BACKEND_API_KEY</Code> processes all due steps;{" "}
            <Code>POST /run/step/{"{id}"}</Code> forces one and returns a reason if it won&rsquo;t send.
          </li>
          <li>
            <strong>Start a sequence:</strong> <Code>POST /api/autonomous/sequences/start</Code> on the
            monolith creates a run and plans its steps.
          </li>
          <li>
            <strong>Simulate a stop:</strong> <Code>POST /api/autonomous/sequences/inbound</Code> with
            header <Code>X-Autonomous-Inbound-Secret: &lt;secret&gt;</Code> and body{" "}
            <Code>{'{ "sentiment_negative": true }'}</Code> or{" "}
            <Code>{'{ "agreement_signed": true }'}</Code>.
          </li>
        </ul>
      </Card>

      <Callout tone="warn" title="Test tooling is thin">
        <p>
          The frontend has a <Code>vitest.config.ts</Code> but little coverage; the backend ships{" "}
          <Code>ruff</Code> + <Code>mypy</Code> and no test runner. An early task for the new hire is
          real unit tests — <Code>pytest</Code> for the backend runner, and fleshing out Vitest on
          the frontend. Until then, exercise the backend manually via <Code>POST /run</Code>,{" "}
          <Code>POST /run/run/&#123;run_id&#125;</Code> and{" "}
          <Code>POST /run/step/&#123;step_id&#125;</Code>. <Ref>api.py:46</Ref>
        </p>
      </Callout>
    </div>
  );
}

const BODIES: Record<SectionId, () => React.ReactElement> = {
  overview: Overview,
  create: CreateLoop,
  system: SystemMap,
  lifecycle: Lifecycle,
  scheduling: Scheduling,
  stops: Stops,
  channels: Channels,
  drafting: Drafting,
  data: DataModel,
  integrations: Integrations,
  glossary: Glossary,
  messaging: Messaging,
  testing: Testing,
};

/* ── main component ───────────────────────────────────────────────────────── */

export default function AutonomousResources() {
  const [active, setActive] = useState<SectionId>("overview");
  const Body = BODIES[active];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <strong>Autonomous Resources.</strong> A single reference for how the Autonomous Agent
          works — methodology, scheduling, stop conditions, channels, data and talking points. Content
          is derived from the <span className="font-mono">autonomous_agent_backend</span> worker and{" "}
          <span className="font-mono">text_agent_backend</span> (verified 20 Aug 2026). Green
          tags are confirmed in code; amber tags flag something to action or check.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">
        {/* section rail */}
        <nav
          className={cn(card, "overflow-hidden lg:sticky lg:top-4")}
          aria-label="Autonomous resource sections"
        >
          <ul className="p-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-current={active === s.id}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active === s.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                  )}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* body */}
        <div className="min-w-0">
          <Body />
        </div>
      </div>
    </div>
  );
}
