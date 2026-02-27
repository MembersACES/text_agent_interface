"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export interface ToolsTabProps {
  businessInfo: Record<string, unknown> | null;
  setBusinessInfo: (info: Record<string, unknown> | null) => void;
}

export function ToolsTab({
  businessInfo,
}: ToolsTabProps) {
  const { showToast } = useToast();
  const info = businessInfo as any;
  const business = info?.business_details || {};
  const contact = info?.contact_information || {};
  const rep = info?.representative_details || {};

  const initialStructure: "Pty Ltd" | "Trust" | "Unknown" = useMemo(() => {
    const name: string = business?.name ?? "";
    if (!name) return "Unknown";
    const lower = name.toLowerCase();
    if (lower.includes("trust")) return "Trust";
    if (lower.includes("pty") || lower.includes("ltd")) return "Pty Ltd";
    return "Unknown";
  }, [business?.name]);

  const [selectedStructure, setSelectedStructure] =
    useState<"Pty Ltd" | "Trust" | "Unknown">(initialStructure);
  const [sendingRobotEmail, setSendingRobotEmail] = useState(false);

  if (!businessInfo) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No business information loaded. Load the member&apos;s business
            details to use business tools.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSendRobotEmail = async () => {
    try {
      setSendingRobotEmail(true);
      const payload = {
        business_name: business.name,
        contact_email: contact.email,
        contact_name: rep.contact_name,
        structure: selectedStructure,
      };

      const res = await fetch(
        "https://membersaces.app.n8n.cloud/webhook-test/opex_finance_email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        showToast(
          `OPEX Step 1 email triggered successfully for ${business.name || "this member"}`,
          "success"
        );
      } else {
        const text = await res.text();
        showToast(`n8n error (${res.status}): ${text}`, "error");
      }
    } catch (err) {
      console.error("Webhook error:", err);
      showToast("Failed to send OPEX email. Check console for details.", "error");
    } finally {
      setSendingRobotEmail(false);
    }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Business tools
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Quick actions that integrate with Robot Finance and other back-office tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40">
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Robot Finance
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Configure OPEX documentation requirements and send Step 1 email
              to the client.
            </div>

            <div className="mb-2">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business structure
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="structure"
                    value="Pty Ltd"
                    checked={selectedStructure === "Pty Ltd"}
                    onChange={() => setSelectedStructure("Pty Ltd")}
                  />
                  Pty Ltd
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="structure"
                    value="Trust"
                    checked={selectedStructure === "Trust"}
                    onChange={() => setSelectedStructure("Trust")}
                  />
                  Trust
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="structure"
                    value="Unknown"
                    checked={selectedStructure === "Unknown"}
                    onChange={() => setSelectedStructure("Unknown")}
                  />
                  Unknown
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendRobotEmail}
              disabled={sendingRobotEmail}
              className="px-3 py-1.5 mt-2 rounded bg-primary text-white text-xs font-medium hover:opacity-90 w-full disabled:opacity-60"
            >
              {sendingRobotEmail ? "Sending..." : "Generate Step 1 email"}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              The finance partner will follow up with Step 2 requirements after
              submission.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

