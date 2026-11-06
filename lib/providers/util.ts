import type { Condition, Offer } from "../types";

export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function normalizeCondition(raw: unknown): Condition {
  const s = String(raw ?? "").toLowerCase();
  if (!s) return "unknown";
  if (s.includes("refurb")) return "refurbished";
  if (s.includes("used") || s.includes("pre-owned") || s.includes("second")) return "used";
  if (s.includes("new")) return "new";
  return "unknown";
}

export function makeOffer(o: Omit<Offer, "total" | "id"> & { id?: string }): Offer {
  const total = Math.round((o.price + (o.shipping ?? 0)) * 100) / 100;
  return { ...o, id: o.id ?? `${o.provider}:${o.url}`, total };
}
