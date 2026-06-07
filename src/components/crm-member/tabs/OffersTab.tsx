"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "../shared/SectionHeader";
import { OfferStatusBadge } from "../shared/OfferStatusBadge";
import { RecordRow } from "../shared/RecordRow";
import { buildOfferRecordSubtitle } from "../shared/offerRecordMeta";
import { getRecordRowIcon } from "../shared/recordRowIcons";
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
    <Card className="p-0">
      <CardContent className="p-4 space-y-3">
        <SectionHeader
          title="Offers & Quote Requests"
          actions={
            <>
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
            </>
          }
        />
        {offers.length === 0 ? (
          <EmptyState
            title="No offers recorded for this client yet."
            className="py-6 items-start text-left [&_h3]:text-sm [&_h3]:font-normal [&_h3]:text-gray-500 [&_h3]:dark:text-gray-400 [&_h3]:mb-0"
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/40 -mx-4">
            {offers.map((o) => {
              const utilityLabel =
                o.utility_display || o.utility_type_identifier || o.utility_type || "Offer";
              const rowIcon = getRecordRowIcon(utilityLabel);
              return (
                <RecordRow
                  key={o.id}
                  leadingIcon={rowIcon.icon}
                  iconIntent={rowIcon.intent}
                  title={
                    <Link
                      href={`/offers/${o.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {utilityLabel}
                      {o.identifier ? ` ${o.identifier}` : ""}
                    </Link>
                  }
                  subtitle={buildOfferRecordSubtitle(o)}
                  status={<OfferStatusBadge status={o.status} />}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
