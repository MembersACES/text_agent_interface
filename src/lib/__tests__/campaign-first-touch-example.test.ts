import { describe, expect, it } from "vitest";
import {
  GCI_FIRST_TOUCH_HTML,
  GCI_FIRST_TOUCH_SUBJECT,
} from "../campaign-first-touch-example";
import { extractTokens, renderTemplate } from "../merge-template";

describe("GCI first-touch example", () => {
  it("only uses per-recipient merge tokens from the mapped set", () => {
    expect(GCI_FIRST_TOUCH_SUBJECT).toBe(
      "2027-2029 gas allocation — recent invoices for review",
    );
    expect(extractTokens(GCI_FIRST_TOUCH_HTML)).toEqual([
      "first_name",
      "company_name",
      "company_name",
      "company_name",
    ]);
    expect(GCI_FIRST_TOUCH_HTML.toLowerCase()).not.toContain("eoi");
    expect(GCI_FIRST_TOUCH_HTML.toLowerCase()).not.toContain(
      "expression of interest",
    );
    expect(GCI_FIRST_TOUCH_HTML).toContain("recent gas invoices");
  });

  it("renders the prospect name and company without leaking sender placeholders", () => {
    const { output, unresolved } = renderTemplate(GCI_FIRST_TOUCH_HTML, {
      first_name: "Kim",
      company_name: "A1 Ashpalt Supplies Pty Ltd",
    });
    expect(unresolved).toEqual([]);
    expect(output).toContain("Hi Kim,");
    expect(output).toContain("A1 Ashpalt Supplies Pty Ltd");
    expect(output).toContain("I'm Amelia Williams from Carbon Zero Australasia");
    expect(output).toContain("Amelia Williams");
    expect(output).toContain("business@acesolutions.com.au");
    expect(output).not.toContain("Max Haas");
    expect(output).not.toContain("max.h@acesolutions.com.au");
    expect(output).not.toContain("[First Name]");
    expect(output).not.toContain("[Your Name]");
    expect(output).not.toContain("[Company Name]");
  });
});
