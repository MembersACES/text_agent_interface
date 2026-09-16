import { afterEach, describe, expect, it, vi } from "vitest";
import { CampaignDeleteError, deleteCampaign, listCampaigns } from "../campaign-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listCampaigns", () => {
  it("requests archived campaigns only when asked", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [],
    }));
    vi.stubGlobal("fetch", fetchMock);
    await listCampaigns("token");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("include_archived");
    await listCampaigns("token", true);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("include_archived=true");
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
