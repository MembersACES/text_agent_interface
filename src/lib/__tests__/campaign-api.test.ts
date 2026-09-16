import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignDeleteError, deleteCampaign, listCampaigns } from "../campaign-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listCampaigns", () => {
  it("requests archived campaigns only when asked", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return {
          ok: true,
          json: async () => [],
        };
      }),
    );
    await listCampaigns("token");
    await listCampaigns("token", true);
    expect(urls).toHaveLength(2);
    expect(urls[0]).not.toContain("include_archived");
    expect(urls[1]).toContain("include_archived=true");
  });
});

describe("deleteCampaign", () => {
  it("surfaces run and offer counts when confirm is required", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          detail: {
            confirm_required: true,
            message:
              "This campaign created 45 runs and 45 offers. Deleting it will also delete them.",
            runs: 45,
            offers: 45,
          },
        }),
      })),
    );
    const error = await deleteCampaign("token", 7).catch((caught) => caught);
    expect(error).toBeInstanceOf(CampaignDeleteError);
    expect(error).toMatchObject({
      runs: 45,
      offers: 45,
      message: "This campaign created 45 runs and 45 offers. Deleting it will also delete them.",
    });
  });
});
