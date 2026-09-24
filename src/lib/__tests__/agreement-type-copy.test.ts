import { describe, expect, it } from "vitest";

import {
  blankTypeDraft,
  typeDraftProblem,
} from "@/lib/agreement-type-copy";

function draft(overrides: Partial<ReturnType<typeof blankTypeDraft>> = {}) {
  return {
    ...blankTypeDraft(),
    label: "Simply Waste",
    ...overrides,
  };
}

describe("agreement type copy", () => {
  it("accepts the default wording", () => {
    expect(typeDraftProblem(draft())).toBeNull();
  });

  it("requires a subject", () => {
    expect(typeDraftProblem(draft({ subject: "  " }))).toMatch(/Subject is required/);
  });

  it("requires a first email body", () => {
    expect(typeDraftProblem(draft({ body: "  " }))).toMatch(/First email body is required/);
  });

  it("allows a blank chase body", () => {
    expect(typeDraftProblem(draft({ chaseBody: "  " }))).toBeNull();
  });

  it("rejects chase days that are out of order", () => {
    expect(typeDraftProblem(draft({ chaseDays: "3, 1" }))).toMatch(/ascending/);
  });

  it("rejects duplicate chase days", () => {
    expect(typeDraftProblem(draft({ chaseDays: "1, 1" }))).toMatch(/duplicate/i);
  });

  it("rejects a chase day below 1", () => {
    expect(typeDraftProblem(draft({ chaseDays: "0, 3" }))).toMatch(/between 1 and 30/);
  });

  it("rejects a chase day above 30", () => {
    expect(typeDraftProblem(draft({ chaseDays: "1, 31" }))).toMatch(/between 1 and 30/);
  });

  it("rejects more than five chase days", () => {
    expect(typeDraftProblem(draft({ chaseDays: "1, 2, 3, 4, 5, 6" }))).toMatch(/at most 5/);
  });

  it("names an unknown token", () => {
    expect(typeDraftProblem(draft({ subject: "Rate {{current_rate}}" }))).toBe(
      "{{current_rate}} is not available on this lane.",
    );
  });

  it("rejects first_name because this lane does not fill it", () => {
    expect(typeDraftProblem(draft({ body: "Hi {{first_name}}," }))).toBe(
      "{{first_name}} is not available on this lane.",
    );
  });
});
