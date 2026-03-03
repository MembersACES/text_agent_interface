/**
 * Standard shape returned by floating agent tools.
 * Used by the API route and FloatingAgentChat to show message + navigation.
 */
export interface ToolResponse {
  message: string;
  suggestedPage?: string | null;
  suggestedLinks?: { label: string; href: string }[];
}
