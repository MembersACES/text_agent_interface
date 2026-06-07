"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
export interface MemberStageSlice {
  stage: string;
  label: string;
  count: number;
  percent: number;
}

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const STAGE_COLORS = ["#5750F1", "#0ABEF9", "#22AD5C", "#F59E0B", "#E10E0E"];

interface MemberStageDonutProps {
  stages: MemberStageSlice[];
}

export function MemberStageDonut({ stages }: MemberStageDonutProps) {
  const active = stages.filter((s) => s.count > 0);

  if (active.length === 0) {
    return (
      <Card className="border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
        <CardContent className="p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Members by stage
          </h2>
          <EmptyState
            icon={<Users className="size-10" />}
            title="No members yet"
            description="Member stage breakdown will appear once clients are added."
          />
        </CardContent>
      </Card>
    );
  }

  const options: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    colors: STAGE_COLORS,
    labels: active.map((s) => s.label),
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Members",
              fontSize: "11px",
              color: "#9CA3AF",
              formatter: () =>
                active.reduce((sum, s) => sum + s.count, 0).toString(),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (v, opts) => {
          const slice = active[opts.seriesIndex];
          const pct = slice ? Math.round(slice.percent) : 0;
          return `${v} (${pct}%)`;
        },
      },
    },
  };

  return (
    <Card className="border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
      <CardContent className="p-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
          Members by stage
        </h2>
        <div className="min-h-[180px]">
          <ApexChart
            type="donut"
            height={180}
            options={options}
            series={active.map((s) => s.count)}
          />
        </div>
        <ul className="mt-3 space-y-1.5">
          {active.map((s, i) => (
            <li key={s.stage} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
                />
                {s.label}
              </span>
              <span className="tabular-nums font-semibold text-dark dark:text-white">
                {s.count}{" "}
                <span className="font-normal text-gray-500">({Math.round(s.percent)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
