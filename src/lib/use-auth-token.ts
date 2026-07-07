import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

/**
 * Auth token for backend API calls. Prefers the live NextAuth session;
 * falls back to a legacy `?token=` query param when present.
 */
export function useAuthToken() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") || "";
  const sessionToken =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token
    ?? (session as { accessToken?: string } | null)?.accessToken
    ?? "";

  return {
    token: urlToken || sessionToken,
    sessionStatus: status,
    isSessionLoading: status === "loading",
  };
}
