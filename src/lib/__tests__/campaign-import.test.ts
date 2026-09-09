import { describe, expect, it } from "vitest";
import {
  columnShapeWarnings,
  groupRecipients,
  resolveRecipients,
} from "../campaign-import";
import { INTELLIGENCE_SENTINEL, buildMergeRows } from "../merge-template";

describe("groupRecipients", () => {
  it("never drops duplicate emails — groups and reports both counts", () => {
    const mergeRows = [
      { contact_email: "ada@example.com", company_name: "Ada Co" },
      { contact_email: "Ada@example.com", company_name: "Ada Co" },
      { contact_email: "ada@example.com", company_name: "Ada Co" },
      { contact_email: "bob@example.com", company_name: "Bob Co" },
    ];
    const groups = groupRecipients(mergeRows);
    expect(mergeRows).toHaveLength(4);
    expect(groups).toHaveLength(2);
    const ada = groups.find((group) => group.email === "ada@example.com");
    expect(ada?.sourceIndexes).toEqual([0, 1, 2]);
    expect(ada?.identical).toBe(true);
    expect(resolveRecipients(mergeRows, groups, {})).toHaveLength(2);
  });

  it("flags groups whose mapped fields differ and does not auto-pick", () => {
    const mergeRows = [
      {
        contact_email: "nicole.hu@ap.jll.com",
        company_name: "Australian Federal Police",
        state: "ACT",
      },
      {
        contact_email: "nicole.hu@ap.jll.com",
        company_name: "Department of Agriculture",
        state: "VIC",
      },
    ];
    const groups = groupRecipients(mergeRows);
    expect(groups).toHaveLength(1);
    expect(groups[0].identical).toBe(false);
    expect(groups[0].differingKeys).toEqual(
      expect.arrayContaining(["company_name", "state"]),
    );
    expect(resolveRecipients(mergeRows, groups, {})).toHaveLength(0);
    expect(resolveRecipients(mergeRows, groups, { [groups[0].id]: 1 })).toEqual(
      [
        expect.objectContaining({
          sourceIndex: 1,
          mergeRow: mergeRows[1],
        }),
      ],
    );
  });

  it("does not lump blank emails together", () => {
    const groups = groupRecipients([
      { contact_email: "", company_name: "A" },
      { contact_email: "", company_name: "B" },
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("columnShapeWarnings", () => {
  it("warns when a mapped email column is mostly not emails", () => {
    const headers = ["phone_or_email", "state"];
    const rows = Array.from({ length: 10 }, (_, i) => [
      i === 0 ? "ada@example.com" : "Kim McGill",
      "VIC",
    ]);
    const warnings = columnShapeWarnings(headers, rows, {
      phone_or_email: "contact_email",
      state: "state",
    });
    const email = warnings.find((warning) => warning.key === "contact_email");
    expect(email).toBeTruthy();
    expect(email!.okCount).toBe(1);
  });

  it("does not shape-check Intelligence columns", () => {
    const warnings = columnShapeWarnings(
      ["email", "rate"],
      [["not-an-email", "16.76"]],
      { email: INTELLIGENCE_SENTINEL, rate: INTELLIGENCE_SENTINEL },
    );
    expect(warnings).toEqual([]);
  });
});

describe("buildMergeRows with Intelligence", () => {
  it("omits intelligence cells from every merge row", () => {
    const rows = buildMergeRows(
      ["company_name", "XX_current_rate"],
      [["Acme", "16.76"]],
      { company_name: "company_name", XX_current_rate: INTELLIGENCE_SENTINEL },
    );
    expect(rows[0]).toEqual({ company_name: "Acme" });
    expect(JSON.stringify(rows)).not.toContain("16.76");
  });
});
