/** Format Vault AI Settings LLM Token Usage timestamps to match Veeva Help. */
export function formatTokenUsageGmt(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = d.getUTCHours() >= 12 ? "PM" : "AM";
  let hour12 = d.getUTCHours() % 12;
  if (hour12 === 0) hour12 = 12;
  const hour = String(hour12).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hour}:${min} ${ampm} GMT`;
}
