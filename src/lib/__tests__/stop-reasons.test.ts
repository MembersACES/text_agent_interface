import { describe, expect, it } from "vitest";
import { stopReasonLabel } from "../stop-reasons";

describe("stopReasonLabel", () => {
  it("labels undeliverable so Needs attention can show a hard-bounce stop", () => {
    expect(stopReasonLabel("undeliverable")).toBe("Undeliverable");
  });
});
