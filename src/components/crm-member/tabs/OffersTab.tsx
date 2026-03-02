"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OfferStatusBadge } from "../shared/OfferStatusBadge";
import { formatDate } from "../shared/formatDate";
import { OFFER_PIPELINE_STAGE_LABELS } from "@/constants/crm";
import type { OfferPipelineStage } from "@/constants/crm";
import type { Offer } from "../types";

export interface OffersTabProps {
  offers: Offer[];
  onCreateOfferClick: () => void;
}

export function OffersTab({
  offers,
  onCreateOfferClick,
}: OffersTabProps) {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Offers & Quote Requests
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateOfferClick}
              className="text-xs font-medium text-primary hover:underline"
            >
              Create offer
            </button>
            <Link href="/offers" className="text-xs text-primary hover:underline">
              View All Offers
            </Link>
          </div>
        </div>
        {offers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No offers recorded for this client yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {offers.map((o) => (
              <li
                key={o.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/offers/${o.id}`}
                    className="font-medium text-gray-900 dark:text-gray-100 hover:underline truncate block"
                  >
                    {(o.utility_display || o.utility_type_identifier || o.utility_type || "Offer") +
                      (o.identifier ? " " + o.identifier : "")}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created {formatDate(o.created_at)}
                    {o.updated_at && o.updated_at !== o.created_at && (
                      <> · Updated {formatDate(o.updated_at)}</>
                    )}
                  </p>
                  {(o.pipeline_stage != null || o.estimated_value != null) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {o.pipeline_stage != null && (
                        <span>
                          {OFFER_PIPELINE_STAGE_LABELS[o.pipeline_stage as OfferPipelineStage] ?? o.pipeline_stage}
                        </span>
                      )}
                      {o.pipeline_stage != null && o.estimated_value != null && " · "}
                      {o.estimated_value != null && (
                        <span>Est. value: ${o.estimated_value.toLocaleString()}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs whitespace-nowrap">
                  <OfferStatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
