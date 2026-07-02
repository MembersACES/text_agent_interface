"use client";

import { useEffect, useState } from "react";
import { getDeploymentEnvironment, type DeploymentEnvironment } from "@/lib/utils";

const BANNER_STYLES: Record<
  Exclude<DeploymentEnvironment, "prod">,
  { label: string; className: string }
> = {
  local: {
    label: "Local",
    className: "bg-amber-500 text-amber-950",
  },
  dev: {
    label: "Dev",
    className: "bg-sky-600 text-white",
  },
};

export function EnvironmentBanner() {
  const [environment, setEnvironment] = useState<DeploymentEnvironment | null>(null);

  useEffect(() => {
    setEnvironment(getDeploymentEnvironment());
  }, []);

  if (!environment || environment === "prod") {
    return null;
  }

  const { label, className } = BANNER_STYLES[environment];

  return (
    <div
      role="status"
      aria-label={`${label} environment`}
      className={`flex h-6 items-center justify-center text-center text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {label}
    </div>
  );
}
