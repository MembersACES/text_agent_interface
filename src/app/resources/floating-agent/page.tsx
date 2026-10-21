"use client";

import React from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MessageSquare, Search, ListTodo, BarChart3, Bot, MapPinned } from "lucide-react";
import { catalogGroups, MEMBER_JOBS } from "@/lib/floatingagent/catalog";

const SKILLS = [
  {
    icon: Search,
    title: "Find a member",
    detail: "“Find member Acme”, “Who is Harbour Lights”, “Open Northside Group”.",
  },
  {
    icon: ListTodo,
    title: "Tasks",
    detail: "“My tasks”, “What’s due”, or “What tasks are on this member?” while their record is open.",
  },
  {
    icon: BarChart3,
    title: "Two different pipelines",
    detail: "“CRM summary” is member stages. “How many unsigned gas sites?” is the unsigned utility pipeline.",
  },
  {
    icon: Bot,
    title: "Autonomous queue",
    detail: "“Summarise the autonomous queue”, or ask where campaigns and agreement follow-up live.",
  },
  {
    icon: MapPinned,
    title: "Member tabs",
    detail: "On an open member, ask for documents, site photos, utilities, offers, savings, solutions, or climate.",
  },
  {
    icon: MessageSquare,
    title: "Where do I…",
    detail: "Ask in plain language. The reply includes a button to the page it looked up.",
  },
];

export default function FloatingAgentPage() {
  const groups = catalogGroups();

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div>
        <h1 className="mb-2 text-heading-3 font-bold text-dark dark:text-white">Floating Agent</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          The Carbon Zero Assistant sits in the bottom-right of the dashboard. It looks up live CRM, task, unsigned-pipeline, and autonomous-queue data, and it only links to pages that exist in the app.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <div
              key={skill.title}
              className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark"
            >
              <div className="mb-2 flex items-center gap-2 text-dark dark:text-white">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">{skill.title}</h2>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{skill.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
        <h2 className="mb-2 font-semibold text-dark dark:text-white">On an open member</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Ask while you are on the member record. The assistant opens the matching tab.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MEMBER_JOBS.map((job) => (
            <li key={job.tab} className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium text-dark dark:text-white">{job.label}.</span> {job.description}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-dark dark:text-white">Pages it can open</h2>
        {groups.map((group) => (
          <section
            key={group.group}
            className="rounded-xl border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-gray-dark"
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {group.group}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.entries.map((entry) => (
                <li key={entry.path}>
                  <Link href={entry.path} className="font-medium text-primary hover:underline">
                    {entry.title}
                  </Link>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
