import { describe, expect, it } from "vitest";
import {
  applyNetworkDataRequest,
  gasNetworkLabelForMirn,
  networkDataRequestFields,
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
    expect(networked.networkDataHistoryYears).toBe(3);
    expect(networked.retailer).toBe("Australian Gas Networks");
    expect(networked.retailerRequestName).toBe("agl");

    const longer = applyNetworkDataRequest({ ...networked, networkDataHistoryYears: 7 }, true);
    expect(longer.networkDataHistoryYears).toBe(7);

    const restored = applyNetworkDataRequest(networked, false);
    expect(restored.networkDataRequest).toBe(false);
    expect(restored.retailer).toBe("agl");
  });

  it("sends a test only to data quote", () => {
    expect(networkDataRequestFields(true, 5, true)).toEqual({
      network_data_request: true,
      data_years: 5,
      test_send: true,
    });
    expect(networkDataRequestFields(true, 3, false)).toEqual({
      network_data_request: true,
      data_years: 3,
    });
  });
});
