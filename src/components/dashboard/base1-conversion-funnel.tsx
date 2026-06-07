"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowRight, UserPlus } from "lucide-react";
import type { Base1ConversionFunnel } from "@/app/(home)/dashboard-data";

interface Base1ConversionFunnelProps {
  funnel: Base1ConversionFunnel;
}

export function Base1ConversionFunnelCard({ funnel }: Base1ConversionFunnelProps) {
  const { activeLeads, converted, totalInBase1, conversionRatePercent } = funnel;
  const hasData = totalInBase1 > 0;

  if (!hasData) {
    return (
      <Card className="border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
        <CardContent className="p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Base 1 pipeline
          </h2>
          <EmptyState
            icon={<UserPlus className="size-10" />}
            title="No Base 1 leads yet"
            description="Leads appear here once Base 1 reviews are submitted."
          />
        </CardContent>
      </Card>
    );
  }

  const activePct = totalInBase1 > 0 ? (activeLeads / totalInBase1) * 100 : 0;
  const convertedPct = totalInBase1 > 0 ? (converted / totalInBase1) * 100 : 0;

  return (
    <Card className="border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Base 1 pipeline
          </h2>
          <Link
            href="/base-1#pipeline"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Hub <ArrowRight className="size-3" />
          </Link>
        </div>

        {conversionRatePercent !== null && (
          <p className="mb-4 text-2xl font-bold tabular-nums tracking-tight text-dark dark:text-white">
            {Math.round(conversionRatePercent)}%
            <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
              converted to members
            </span>
          </p>
        )}

        <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-gray/80 dark:bg-dark-3">
          <div
            className="bg-primary transition-all"
            style={{ width: `${activePct}%` }}
            title={`Active leads: ${activeLeads}`}
          />
          <div
            className="bg-semantic-ok transition-all"
            style={{ width: `${convertedPct}%` }}
            title={`Converted: ${converted}`}
          />
        </div>

        <ul className="space-y-2.5">
          <li className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="size-2 rounded-full bg-primary" />
              Active leads
            </span>
            <span className="tabular-nums font-semibold text-dark dark:text-white">
              {activeLeads}
              <span className="ml-1 font-normal text-gray-500">
                ({Math.round(activePct)}%)
              </span>
            </span>
          </li>
          <li className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="size-2 rounded-full bg-semantic-ok" />
              Converted to members
            </span>
            <span className="tabular-nums font-semibold text-dark dark:text-white">
              {converted}
              <span className="ml-1 font-normal text-gray-500">
                ({Math.round(convertedPct)}%)
              </span>
            </span>
          </li>
          <li className="flex items-center justify-between border-t border-stroke pt-2 text-xs dark:border-dark-3">
            <span className="text-gray-500 dark:text-gray-400">Total in Base 1</span>
            <span className="tabular-nums font-semibold text-dark dark:text-white">
              {totalInBase1}
            </span>
          </li>
        </ul>

        <p className="mt-3 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
          Matched by business name or contact email. Not all CRM members came through Base 1.
        </p>
      </CardContent>
    </Card>
  );
}
