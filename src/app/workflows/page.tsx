"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { WORKFLOW_CARD_GROUPS } from "./_data";

export default function WorkflowsPage() {
  return (
    <div className="space-y-10">
      <PageHeader pageName="Workflows" description="Jump to any workflow by category." />

      <div className="space-y-12">
          {WORKFLOW_CARD_GROUPS.map((group) => (
            <section key={group.label}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {group.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.href} href={card.href}>
                      <Card hover className="h-full border border-gray-200 dark:border-dark-3">
                        <CardContent className="p-5">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-sm`}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-dark dark:text-white mb-1.5 text-base">
                            {card.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {card.description}
                          </p>
                          <div className="flex items-center text-primary text-sm font-medium">
                            Open <ArrowRight className="w-4 h-4 ml-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
