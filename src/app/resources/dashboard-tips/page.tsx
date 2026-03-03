"use client";

import React from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  FileText,
  MessageSquare,
  FolderOpen,
} from "lucide-react";

export default function DashboardTipsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="space-y-3">
        <h1 className="text-heading-3 font-bold text-dark dark:text-white">Dashboard Tips</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          How to get the most out of the ACES dashboard and where to find key tools.
        </p>

        <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
          <p>
            <strong>New to the dashboard?</strong>{" "}
            Start with{" "}
            <button
              type="button"
              onClick={() =>
                document.getElementById("quick-access")?.scrollIntoView({ behavior: "smooth" })
              }
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Quick Access
            </button>{" "}
            in the sidebar, and try the{" "}
            <button
              type="button"
              onClick={() =>
                document.getElementById("floating-agent")?.scrollIntoView({ behavior: "smooth" })
              }
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Floating Agent
            </button>{" "}
            (chat bubble in the bottom-right) whenever you&apos;re not sure where to go.
          </p>
        </div>

        <nav
          aria-label="On this page"
          className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300"
        >
          <span className="font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            On this page
          </span>
          <button
            type="button"
            onClick={() =>
              document.getElementById("quick-access")?.scrollIntoView({ behavior: "smooth" })
            }
            className="rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark px-3 py-1 hover:border-primary/60 hover:text-primary"
          >
            Quick Access
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("crm")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark px-3 py-1 hover:border-primary/60 hover:text-primary"
          >
            CRM
          </button>
          <button
            type="button"
            onClick={() =>
              document.getElementById("tasks")?.scrollIntoView({ behavior: "smooth" })
            }
            className="rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark px-3 py-1 hover:border-primary/60 hover:text-primary"
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={() =>
              document.getElementById("documents")?.scrollIntoView({ behavior: "smooth" })
            }
            className="rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark px-3 py-1 hover:border-primary/60 hover:text-primary"
          >
            Documents &amp; lodgement
          </button>
          <button
            type="button"
            onClick={() =>
              document.getElementById("floating-agent")?.scrollIntoView({ behavior: "smooth" })
            }
            className="rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark px-3 py-1 hover:border-primary/60 hover:text-primary"
          >
            Floating Agent
          </button>
          <button
            type="button"
            onClick={() =>
              document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" })
            }
            className="rounded-full border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark px-3 py-1 hover:border-primary/60 hover:text-primary"
          >
            Resources
          </button>
        </nav>
      </div>

      <div className="space-y-8">
        <section
          id="quick-access"
          className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6"
        >
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Quick Access
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            The <span className="font-semibold">Quick Access</span> section in the sidebar gives you
            one-click entry to the most used areas:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
            <li>
              <strong>
                <Link href="/tasks" className="text-primary hover:underline">
                  Tasks
                </Link>
              </strong>{" "}
              — Your assigned tasks and team task management.
            </li>
            <li>
              <strong>
                <Link href="/solution-range" className="text-primary hover:underline">
                  Solution Range
                </Link>
              </strong>{" "}
              — Browse ACES solutions (renewable, bots, voice agents, etc.).
            </li>
            <li>
              <strong>
                <Link href="/business-info" className="text-primary hover:underline">
                  Member Profile
                </Link>{" "}
                (Business Info)
              </strong>{" "}
              — Search for a client and view their full profile, documents, utilities, and tools
              in one place.
            </li>
            <li>
              <strong>
                <Link href="/document-lodgement" className="text-primary hover:underline">
                  Invoice &amp; Data Lodgement
                </Link>
              </strong>{" "}
              — Lodge invoice and data reports.
            </li>
            <li>
              <strong>
                <Link href="/base-1" className="text-primary hover:underline">
                  Base 1 Hub
                </Link>
              </strong>{" "}
              — Base 1 Review lead pipeline.
            </li>
          </ul>
        </section>

        <section
          id="crm"
          className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6"
        >
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            CRM
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            CRM is where clients (members), offers, and pipeline stages live:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
            <li>
              <strong>
                <Link href="/crm" className="text-primary hover:underline">
                  CRM Dashboard
                </Link>
              </strong>{" "}
              — Pipeline overview and stage counts.
            </li>
            <li>
              <strong>
                <Link href="/crm-members" className="text-primary hover:underline">
                  Members
                </Link>
              </strong>{" "}
              — List and search all clients; open a member to see their profile, notes, documents,
              offers, and tasks.
            </li>
            <li>
              <strong>
                <Link href="/offers" className="text-primary hover:underline">
                  Offers
                </Link>
              </strong>{" "}
              — Manage offers and quote requests.
            </li>
            <li>
              <strong>
                <Link href="/reports/activities" className="text-primary hover:underline">
                  Activity report
                </Link>
              </strong>{" "}
              — Recent offer activities and documents.
            </li>
          </ul>
        </section>

        <section
          id="tasks"
          className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6"
        >
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Tasks
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Use the{" "}
            <Link href="/tasks" className="text-primary hover:underline">
              Tasks
            </Link>{" "}
            page to view &quot;My tasks&quot;, tasks you assigned, or all tasks. Create and edit
            tasks and link them to clients. You can also see tasks from within a member profile
            (Tasks tab).
          </p>
        </section>

        <section
          id="documents"
          className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6"
        >
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documents &amp; lodgement
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Document Generation, Invoice &amp; Data Lodgement, Signed Agreement Lodgement, Drive
            Filing, and LOA tools are available from the sidebar (or via Quick Access / Member
            Profile).
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm mb-3">
            <li>
              <strong>Best starting point:</strong> open{" "}
              <Link href="/business-info" className="text-primary hover:underline">
                Member Profile
              </Link>{" "}
              and select a client to prefill document generation and lodgement tools.
            </li>
            <li>
              <strong>Alternative:</strong> open the relevant tool from the sidebar and search for
              the client by name or ID.
            </li>
          </ul>
        </section>

        <section
          id="floating-agent"
          className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6"
        >
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Floating Agent
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Use the chat bubble (bottom-right) to ask in plain language: search clients, see your
            tasks, get a CRM or pipeline summary, or ask &quot;Where do I…?&quot; for navigation
            help. See the{" "}
            <Link href="/resources/floating-agent" className="text-primary hover:underline">
              Floating Agent
            </Link>{" "}
            guide for example phrases and more details.
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Try asking things like: <span className="italic">&quot;Find client Acme&quot;</span>,{" "}
            <span className="italic">&quot;My tasks due today&quot;</span>, or{" "}
            <span className="italic">
              &quot;Where do I upload a signed agreement?&quot;
            </span>
            .
          </p>
        </section>

        <section
          id="resources"
          className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6 space-y-3"
        >
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Resources
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            Under <strong>Resources</strong> in the sidebar you&apos;ll find:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 text-sm">
            <li>
              <Link href="/resources" className="text-primary hover:underline font-semibold">
                Links &amp; Passwords
              </Link>{" "}
              — External tools and credentials.
            </li>
            <li>
              <span className="font-semibold">Dashboard Tips</span> — This page.
            </li>
            <li>
              <Link
                href="/resources/floating-agent"
                className="text-primary hover:underline font-semibold"
              >
                Floating Agent guide
              </Link>{" "}
              — Examples of what you can ask the agent.
            </li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tip: pin this page in your browser or add it to your favourites so you can quickly
            revisit how the dashboard is structured.
          </p>
        </section>
      </div>
    </div>
  );
}
