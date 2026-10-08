import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONTRACT_UPLOAD_MODE,
  buildDriveFilingFormData,
  buildLodgementFormData,
  identifierFieldState,
  identifierWarning,
  isRecipientEmail,
  lodgementBadge,
  recipientEmailsFromCsv,
  suppliersForUtility,
} from "@/lib/file-and-lodge";

describe("file and lodge", () => {
  it("prefills a single NMI and does not show a dropdown", () => {
    const field = identifierFieldState(["6408123456"]);
    expect(field.value).toBe("6408123456");
    expect(field.options).toEqual(["6408123456"]);
    expect(field.useDropdown).toBe(false);
    expect(identifierWarning("nmi", field.value)).toBeNull();
  });

  it("lists every NMI when a utility has several", () => {
    const field = identifierFieldState(["6408123456", "6408765432"]);
    expect(field.useDropdown).toBe(true);
    expect(field.options).toEqual(["6408123456", "6408765432"]);
    expect(field.value).toBe("6408123456");
  });

  it("warns on a short NMI and a MIRN that is not 11 digits", () => {
    expect(identifierWarning("nmi", "12345")).toMatch(/10 characters/);
    expect(identifierWarning("mirn", "12345")).toMatch(/11 digits/);
    expect(identifierWarning("mirn", "12345678901")).toBeNull();
    expect(identifierWarning("nmi", "")).toBeNull();
  });

  it("defaults upload mode to Add to contract", () => {
    expect(DEFAULT_CONTRACT_UPLOAD_MODE).toBe("append");
  });

  it("reuses the same file for Drive filing and lodgement", () => {
    const file = new File(["signed-pdf"], "oakleigh.pdf", { type: "application/pdf" });
    const drive = buildDriveFilingFormData({
      file,
      businessName: "Oakleigh-Carnegie RSL",
      filingType: "signed_CI_E",
      gdriveUrl: "https://drive.google.com/drive/folders/abc",
      contractStatus: "Signed via ACES",
      contractUpdateMode: DEFAULT_CONTRACT_UPLOAD_MODE,
    });
    const lodge = buildLodgementFormData({
      file,
      businessName: "Oakleigh-Carnegie RSL",
      supplier: "Alinta C&I Electricity",
      utility: "C&I Electricity",
      identifierKind: "nmi",
      identifier: "6408123456",
      clientId: 12,
      recipients: [
        "Andrew.Barnes@alintaenergy.com.au",
        "only.this.send@example.com",
        "only.this.send@example.com",
      ],
    });

    const driveFile = drive.get("files");
    const lodgeFile = lodge.get("file_0");
    expect(driveFile).toBeInstanceOf(File);
    expect(lodgeFile).toBeInstanceOf(File);
    expect((driveFile as File).name).toBe(file.name);
    expect((lodgeFile as File).name).toBe(file.name);
    expect((driveFile as File).size).toBe(file.size);
    expect((lodgeFile as File).size).toBe(file.size);
    expect(drive.get("contract_update_mode")).toBe("append");
    expect(lodge.get("skip_drive_filing")).toBe("true");
    expect(lodge.get("contract_type")).toBe("Alinta C&I Electricity");
    expect(lodge.get("utility_type")).toBe("C&I Electricity");
    expect(lodge.get("nmi")).toBe("6408123456");
    expect(lodge.get("agreement_type")).toBe("contract");
    expect(lodge.get("recipient_emails")).toBe(
      "Andrew.Barnes@alintaenergy.com.au, only.this.send@example.com",
    );
  });

  it("prefills recipient chips from a shared comma-separated list", () => {
    expect(
      recipientEmailsFromCsv(
        "Andrew.Barnes@alintaenergy.com.au, data.quote@fornrg.com, Andrew.Barnes@alintaenergy.com.au",
      ),
    ).toEqual(["Andrew.Barnes@alintaenergy.com.au", "data.quote@fornrg.com"]);
    expect(isRecipientEmail("only.this.send@example.com")).toBe(true);
    expect(isRecipientEmail("not-an-email")).toBe(false);
  });

  it("filters suppliers to the utility label", () => {
    const keys = suppliersForUtility("C&I Electricity", null).map((row) => row.key);
    expect(keys).toEqual([
      "Origin C&I Electricity",
      "Momentum C&I Electricity",
      "Alinta C&I Electricity",
      "Other",
    ]);
  });

  it("badges the latest lodgement for that utility", () => {
    const label = lodgementBadge(
      [
        {
          activity_type: "signed_agreement_lodged",
          created_at: "2026-10-01T10:00:00+11:00",
          metadata: { utility: "C&I Electricity", supplier: "Origin C&I Electricity", retailer_name: "Origin C&I" },
        },
        {
          activity_type: "signed_agreement_lodged",
          created_at: "2026-10-08T10:00:00+11:00",
          metadata: { utility: "C&I Electricity", supplier: "Alinta C&I Electricity", retailer_name: "Alinta" },
        },
        {
          activity_type: "signed_agreement_lodged",
          created_at: "2026-10-09T10:00:00+11:00",
          metadata: { utility: "C&I Gas", supplier: "Alinta C&I Gas" },
        },
      ],
      "C&I Electricity",
    );
    expect(label).toBe("Lodged with Alinta");
  });
});
