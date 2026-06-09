"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import type { WeeklyBucket } from "@/app/(home)/dashboard-data";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ActivityOverTimeChartProps {
  data: WeeklyBucket[];
}

export function ActivityOverTimeChart({ data }: ActivityOverTimeChartProps) {
  const hasHistory = data.some((d) => d.count > 0);

  if (!hasHistory) {
    return (
      <Card className="border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
        <CardContent className="p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Activity over time
          </h2>
          <EmptyState
            icon={<BarChart3 className="size-10" />}
            title="No activity history yet"
            description="Activities will appear here once offer activity is logged."
          />
        </CardContent>
      </Card>
    );
  }

  const options: ApexOptions = {
    chart: {
      type: "area",
      height: 240,
      toolbar: { show: false },
      fontFamily: "inherit",
      sparkline: { enabled: false },
    },
    colors: ["#5750F1"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    dataLabels: { enabled: false },
    grid: {
      show: false,
      padding: { left: 8, right: 8, top: 0, bottom: 0 },
    },
    xaxis: {
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: "10px", colors: "#9CA3AF" },
        rotate: 0,
        hideOverlappingLabels: true,
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: "10px", colors: "#9CA3AF" },
        formatter: (v) => Math.round(Number(v)).toString(),
      },
    },
    tooltip: {
      theme: "light",
      y: { formatter: (v) => `${Math.round(Number(v))} activities` },
    },
  };

  return (
    <Card className="border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
      <CardContent className="p-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
          Activity over time
        </h2>
        <div className="min-h-[240px]">
          <ApexChart
            type="area"
            height={240}
            options={options}
            series={[{ name: "Activities", data: data.map((d) => d.count) }]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
