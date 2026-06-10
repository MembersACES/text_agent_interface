export type CrmLinkStatus = "matched" | "no_match" | "ambiguous" | "conflict";

export interface CrmLinkCandidate {
  client_id: number;
  business_name: string;
  external_business_id?: string | null;
  stage: string;
}

export interface CrmLink {
  status: CrmLinkStatus;
  client_id?: number | null;
  record_id?: string | null;
  reason: string;
  candidates?: CrmLinkCandidate[];
}

export function isCrmLinkMatched(link: CrmLink | null | undefined): link is CrmLink & { client_id: number } {
  return link?.status === "matched" && typeof link.client_id === "number";
}
