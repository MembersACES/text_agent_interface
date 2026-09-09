import { describe, expect, it } from "vitest";
import {
  INTELLIGENCE_SENTINEL,
  MERGE_FIELDS,
  buildMergeRow,
  classifyToken,
  extractTokens,
  htmlToPlainText,
  renderTemplate,
  suggestMergeKey,
  validateTemplate,
} from "../merge-template";

describe("extractTokens", () => {
  it("finds repeated and adjacent tokens", () => {
    expect(
      extractTokens("{{first_name}}{{first_name}} {{company_name}}"),
    ).toEqual(["first_name", "first_name", "company_name"]);
  });

  it("ignores single braces and empty tokens", () => {
    expect(extractTokens("{ single } and {{ }} and {{}}")).toEqual([]);
  });

  it("tolerates inner whitespace", () => {
    expect(extractTokens("Hi {{ first_name }}")).toEqual(["first_name"]);
  });

  it("captures case as typed so a mismatch can error", () => {
    expect(extractTokens("Hi {{First_Name}}")).toEqual(["First_Name"]);
  });
});

describe("validateTemplate", () => {
  it("returns every unknown token, not just the first", () => {
    const result = validateTemplate("{{x}} and {{y}} and {{x}}", MERGE_FIELDS);
    expect(result).toEqual({ ok: false, unknown: ["x", "y"] });
  });

  it("treats a known merge field that is not mapped as unknown to the mapped subset", () => {
    const mapped = MERGE_FIELDS.filter((field) => field.key !== "industry");
    const result = validateTemplate("Hello {{industry}}", mapped);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.unknown).toEqual(["industry"]);
    expect(
      classifyToken("industry", new Set(mapped.map((field) => field.key))),
    ).toBe("held_back");
  });

  it("surfaces a case mismatch as an unknown token", () => {
    const mapped = MERGE_FIELDS.filter((field) => field.key === "first_name");
    const result = validateTemplate("Hi {{First_Name}}", mapped);
    expect(result).toEqual({ ok: false, unknown: ["First_Name"] });
    expect(classifyToken("First_Name", new Set(["first_name"]))).toBe(
      "unknown",
    );
  });
});

describe("renderTemplate", () => {
  it("substitutes known tokens and leaves unknown tokens intact", () => {
    const { output, unresolved } = renderTemplate(
      "Hi {{first_name}} {{unknown}}",
      {
        first_name: "Jo",
      },
    );
    expect(output).toBe("Hi Jo {{unknown}}");
    expect(unresolved).toEqual([]);
  });

  it("reports empty-resolved tokens in unresolved", () => {
    const { output, unresolved } = renderTemplate(
      "Hi {{first_name}} at {{company_name}}",
      {
        first_name: "Jo",
        company_name: "",
      },
    );
    expect(output).toBe("Hi Jo at ");
    expect(unresolved).toEqual(["company_name"]);
  });

  it("substitutes tokens that had inner whitespace", () => {
    const { output } = renderTemplate("Hi {{ first_name }}", {
      first_name: "Kim",
    });
    expect(output).toBe("Hi Kim");
  });
});

describe("Hard Rule 1 — intelligence is not substitutable", () => {
  it("does not leak an Intelligence-mapped rate into the merge output", () => {
    const headers = ["$ per GJ", "company_name"];
    const cells = ["16.76", "Acme"];
    const columnMap = {
      "$ per GJ": INTELLIGENCE_SENTINEL,
      company_name: "company_name",
    };
    const mergeRow = buildMergeRow(headers, cells, columnMap);

    expect(mergeRow).toEqual({ company_name: "Acme" });
    expect(Object.keys(mergeRow)).not.toContain("current_rate");

    const { output } = renderTemplate(
      "Rate {{current_rate}} / {{Current_Rate}} / {{company_name}}",
      mergeRow,
    );
    expect(output).toContain("{{current_rate}}");
    expect(output).toContain("{{Current_Rate}}");
    expect(output).toContain("Acme");
    expect(output).not.toContain("16.76");
  });
});

describe("suggestMergeKey", () => {
  it("matches exact and near-exact headers", () => {
    expect(suggestMergeKey("Company Name:")).toBe("company_name");
    expect(suggestMergeKey("Email.")).toBe("contact_email");
    expect(suggestMergeKey("XX_current_rate")).toBeNull();
  });
});

describe("htmlToPlainText", () => {
  it("strips tags without DOMParser in node", () => {
    expect(htmlToPlainText("<p>Hi <strong>Jo</strong></p><br>there")).toContain(
      "Hi Jo",
    );
  });
});
