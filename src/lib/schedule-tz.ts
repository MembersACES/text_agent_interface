export function formatScheduleZone(iana: string | null | undefined): string {
  const zone = (iana || "Australia/Brisbane").trim() || "Australia/Brisbane";
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const abbr = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    return abbr ? `${abbr} (${zone})` : zone;
  } catch {
    return zone;
  }
}
