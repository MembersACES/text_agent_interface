"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { WORKFLOW_CARD_GROUPS } from "./_data";

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-dark dark:via-dark-2 dark:to-dark">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                      <Card className="h-full transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 hover:border-primary/30">
                        <CardContent className="p-5">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg`}
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
    </div>
  );
}
