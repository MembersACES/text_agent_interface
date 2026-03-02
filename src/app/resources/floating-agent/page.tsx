"use client";

import React from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MessageSquare, Search, ListTodo, BarChart3, HelpCircle } from "lucide-react";

export default function FloatingAgentPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div>
        <h1 className="text-heading-3 font-bold text-dark dark:text-white mb-2">Floating Agent</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Use the ACES Floating Agent (chat bubble in the bottom-right) to search clients, view tasks, and get help navigating the dashboard.
        </p>
      </div>

      <div className="rounded-xl border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark p-6 space-y-6">
        <p className="text-dark dark:text-white">
          The Floating Agent can help you with:
        </p>
        <ul className="space-y-3 text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-3">
            <Search className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span><strong>Search clients</strong> — e.g. &quot;Find client Acme&quot;, &quot;Who is [name]&quot;, &quot;Open [business name]&quot;</span>
          </li>
          <li className="flex items-start gap-3">
            <ListTodo className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span><strong>My tasks</strong> — &quot;My tasks&quot;, &quot;What&apos;s due&quot;, &quot;Overdue tasks&quot;</span>
          </li>
          <li className="flex items-start gap-3">
            <ListTodo className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span><strong>Tasks for a client</strong> — &quot;Tasks for [client name]&quot;, &quot;What&apos;s pending for [name]&quot;</span>
          </li>
          <li className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span><strong>CRM / pipeline summary</strong> — &quot;CRM summary&quot;, &quot;Pipeline&quot;, &quot;How many leads?&quot;</span>
          </li>
          <li className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span><strong>Navigation &amp; help</strong> — &quot;Where do I upload an agreement?&quot;, &quot;How do I generate an EOI?&quot;, &quot;Solution Range&quot;</span>
          </li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          CRM and task features require you to be signed in. When the agent returns results, use the suggested links to jump straight to the relevant page (e.g. a client profile or the Tasks page).
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Open the chat with the <MessageSquare className="inline h-4 w-4 align-middle mx-0.5" /> button in the bottom-right corner of the app.
        </p>
      </div>
    </div>
  );
}
