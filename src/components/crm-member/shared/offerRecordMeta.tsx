import type { ReactNode } from "react";
import type { Offer } from "../types";
import { OFFER_PIPELINE_STAGE_LABELS, type OfferPipelineStage } from "@/constants/crm";
import { formatDate } from "./formatDate";

export function buildOfferRecordSubtitle(o: Offer) {
  const lines: ReactNode[] = [];

  lines.push(
    <p key="dates" className="text-xs text-gray-500 dark:text-gray-400">
      Created {formatDate(o.created_at)}
      {o.updated_at && o.updated_at !== o.created_at && (
        <> · Updated {formatDate(o.updated_at)}</>
      )}
    </p>
  );

  if (o.pipeline_stage != null || o.estimated_value != null || o.annual_savings != null) {
    lines.push(
      <p key="pipeline" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {o.pipeline_stage != null && (
          <span>
            {OFFER_PIPELINE_STAGE_LABELS[o.pipeline_stage as OfferPipelineStage] ??
              o.pipeline_stage}
          </span>
        )}
        {o.pipeline_stage != null && (o.estimated_value != null || o.annual_savings != null) && " · "}
        {o.estimated_value != null && (
          <span>Est. value: ${o.estimated_value.toLocaleString()}</span>
        )}
        {o.estimated_value != null && o.annual_savings != null && " · "}
        {o.annual_savings != null && (
          <span>
            Annual savings: $
            {Number(o.annual_savings).toLocaleString("en-AU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </p>
    );
  }

  if (
    o.annual_usage_gj != null ||
    o.energy_charge_pct != null ||
    o.contracted_rate != null ||
    o.offer_rate != null
  ) {
    const parts: string[] = [];
    if (o.annual_usage_gj != null) {
      parts.push(
        `Annual usage: ${Number(o.annual_usage_gj).toLocaleString("en-AU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} GJ`
      );
    }
    if (o.energy_charge_pct != null) {
      parts.push(
        `Energy charge: ${Number(o.energy_charge_pct).toLocaleString("en-AU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`
      );
    }
    if (o.contracted_rate != null) {
      parts.push(
        `Contracted rate: $${Number(o.contracted_rate).toLocaleString("en-AU", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })}`
      );
    }
    if (o.offer_rate != null) {
      parts.push(
        `Offer rate: $${Number(o.offer_rate).toLocaleString("en-AU", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })}`
      );
    }
    lines.push(
      <p key="financial" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {parts.join(" · ")}
      </p>
    );
  }

  return <>{lines}</>;
}
