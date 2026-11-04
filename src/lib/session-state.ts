export type SessionStatus =
  | "loading"
  | "signedOut"
  | "unauthorized"
  | "authorized"
  | "unconfigured"
  | "error";

/** Keep a staff member's draft during retries, but discard it when access ends. */
export function draftSessionKey(
  status: SessionStatus,
  userId: string | null | undefined,
): string {
  if (userId && (status === "authorized" || status === "loading")) {
    return `staff:${userId}`;
  }
  return `cleared:${status}:${userId ?? "guest"}`;
}

export type CatalogSource = "brands" | "rods";

/** Cached and server updates from one collection cannot finish the other load. */
export function createCatalogReadinessTracker(): (source: CatalogSource) => boolean {
  const pending = new Set<CatalogSource>(["brands", "rods"]);
  return (source) => {
    pending.delete(source);
    return pending.size === 0;
  };
}
