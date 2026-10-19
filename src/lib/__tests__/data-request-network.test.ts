import { describe, expect, it } from "vitest";
import {
  applyNetworkDataRequest,
  gasNetworkLabelForMirn,
  type DataRequestSummary,
} from "@/lib/data-request";

const summary: DataRequestSummary = {
  businessName: "Specialised Linen Services (Adelaide) Pty Ltd",
  retailer: "agl",
  identifier: "55102091396",
  requestType: "gas_ci",
  param: "mrin",
};

describe("gas network data request", () => {
  it("suggests the network from the MIRN and keeps the retailer for later", () => {
    expect(gasNetworkLabelForMirn("55102091396")).toBe("Australian Gas Networks");
    expect(gasNetworkLabelForMirn("52477254208")).toBe("Jemena Gas Networks (NSW)");
    expect(gasNetworkLabelForMirn("53104321389")).toBe("Multinet Gas");
    expect(gasNetworkLabelForMirn("53300000000")).toBe("AusNet Gas");
    expect(gasNetworkLabelForMirn("56000000000")).toBe("ATCO Gas");

    const networked = applyNetworkDataRequest(summary, true);
    expect(networked.networkDataRequest).toBe(true);
    expect(networked.retailer).toBe("Australian Gas Networks");
    expect(networked.retailerRequestName).toBe("agl");

    const restored = applyNetworkDataRequest(networked, false);
    expect(restored.networkDataRequest).toBe(false);
    expect(restored.retailer).toBe("agl");
  });
});
