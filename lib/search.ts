import type { Condition, Offer, Provider, ProviderStatus, SearchResponse } from "./types";
import { serpApiProvider } from "./providers/serpapi";
import { ebayProvider } from "./providers/ebay";
import { demoProvider } from "./providers/demo";

const PROVIDERS: Provider[] = [serpApiProvider, ebayProvider, demoProvider];
const PROVIDER_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface SearchOptions {
  condition: Condition | "any";
  /** Apply relevance + outlier filtering (on by default) */
  strict: boolean;
}

// ---------- caching (raw provider results, per query) ----------

const cache = new Map<string, { at: number; offers: Offer[]; providers: ProviderStatus[] }>();

async function fetchAll(query: string) {
  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit, cached: true };

  const providers: ProviderStatus[] = [];
  const offers: Offer[] = [];

  await Promise.all(
    PROVIDERS.map(async (p) => {
      if (!p.isConfigured()) {
        providers.push({ name: p.name, status: "skipped", count: 0, message: "Not configured" });
        return;
      }
      try {
        const results = await p.search(query, AbortSignal.timeout(PROVIDER_TIMEOUT_MS));
        offers.push(...results);
        providers.push({ name: p.name, status: "ok", count: results.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        providers.push({ name: p.name, status: "error", count: 0, message });
      }
    }),
  );

  providers.sort((a, b) => PROVIDERS.findIndex((p) => p.name === a.name) - PROVIDERS.findIndex((p) => p.name === b.name));
  // Only cache when at least one provider succeeded
  if (providers.some((p) => p.status === "ok")) cache.set(key, { at: Date.now(), offers, providers });
  return { offers, providers, cached: false };
}

// ---------- relevance filtering ----------

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "for", "with", "of", "in", "new"]);
const ACCESSORY_WORDS = [
  "case", "cover", "protector", "skin", "sticker", "decal", "charger", "cable", "adapter",
  "strap", "band", "mount", "holder", "stand", "replacement", "parts", "compatible",
  "sleeve", "pouch", "tempered", "lens cap", "box only", "empty box", "manual only",
];

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function isRelevant(offer: Offer, queryTokens: string[], queryText: string): boolean {
  const title = offer.title.toLowerCase();
  const titleTokens = new Set(tokens(title));
  const matched = queryTokens.filter((t) => titleTokens.has(t)).length;
  // Require (almost) every query word to appear in the title
  const needed = queryTokens.length <= 2 ? queryTokens.length : Math.ceil(queryTokens.length * 0.75);
  if (matched < needed) return false;

  // Drop accessories unless the user is searching for one
  for (const word of ACCESSORY_WORDS) {
    if (!queryText.includes(word) && new RegExp(`\\b${word}\\b`).test(title)) return false;
  }
  return true;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ---------- public entry point ----------

export async function searchLowestPrice(rawQuery: string, opts: SearchOptions): Promise<SearchResponse> {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  const { offers: raw, providers, cached } = await fetchAll(query);

  let offers = raw.filter((o) => o.url && o.price > 0);
  if (opts.condition !== "any") offers = offers.filter((o) => o.condition === opts.condition);

  // De-duplicate identical store + price listings
  const seen = new Set<string>();
  offers = offers.filter((o) => {
    const k = `${o.store.toLowerCase()}|${o.total}|${o.title.toLowerCase().slice(0, 40)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const before = offers.length;
  if (opts.strict) {
    const qTokens = tokens(query);
    const qText = query.toLowerCase();
    offers = offers.filter((o) => isRelevant(o, qTokens, qText));

    // Remove suspiciously cheap outliers (scams, parts, accessories that slipped through)
    if (offers.length >= 4) {
      const m = median(offers.map((o) => o.total));
      offers = offers.filter((o) => o.total >= m * 0.4);
    }
  }

  offers.sort((a, b) => a.total - b.total);
  return {
    query,
    offers,
    lowest: offers[0] ?? null,
    providers,
    filteredOut: before - offers.length,
    cached,
  };
}
