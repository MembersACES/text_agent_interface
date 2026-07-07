import React from "react";
import { getUtilityKeyFields } from "@/lib/utility-key-fields";

type Props = {
  utilityType: string;
  record: Record<string, unknown> | null | undefined;
  rowNumber?: number | null;
};

export function UtilityDetailsDisplay({ utilityType, record, rowNumber }: Props) {
  const fields = getUtilityKeyFields(utilityType, record);

  return (
    <div className="bg-gray-50 rounded p-4 space-y-2 dark:bg-dark-2">
      {rowNumber != null ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sheet row {rowNumber}</p>
      ) : null}
      <div className="flex justify-between gap-4">
        <span className="font-medium">{fields.identifierLabel}:</span>
        <span className="text-right">{fields.identifier || "—"}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="font-medium">Client Name:</span>
        <span className="text-right">{fields.clientName || "—"}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="font-medium">Retailer:</span>
        <span className="text-right">{fields.retailer || "—"}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="font-medium">Site Address:</span>
        <span className="text-right">{fields.address || "—"}</span>
      </div>
    </div>
  );
}
