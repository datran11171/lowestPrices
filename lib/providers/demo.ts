import type { Offer, Provider } from "../types";
import { REGION } from "../region";
import { makeOffer } from "./util";

const STORES = ["JB Hi-Fi", "Harvey Norman", "Officeworks", "The Good Guys", "Amazon AU", "Big W", "Kogan"];

/** Deterministic pseudo-random so the same query always gives the same demo results. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A generated product-tile SVG (as a data URI) so demo results have images. */
function demoImage(label: string, hue: number, icon: "box" | "case" = "box") {
  const words = label.trim().split(/\s+/);
  const lines = [words.slice(0, 2).join(" "), words.slice(2, 4).join(" ")]
    .filter(Boolean)
    .map((l) => escapeXml(l.length > 14 ? l.slice(0, 13) + "…" : l));
  const shape =
    icon === "box"
      ? `<path d="M60 22l30 13-30 13-30-13z" fill="hsl(${hue} 70% 85%)"/><path d="M30 35v32l30 13V48z" fill="hsl(${hue} 60% 55%)"/><path d="M90 35v32L60 80V48z" fill="hsl(${hue} 60% 45%)"/>`
      : `<rect x="38" y="20" width="44" height="62" rx="10" fill="none" stroke="hsl(${hue} 60% 45%)" stroke-width="6"/>`;
  const text = lines
    .map((l, i) => `<text x="60" y="${100 + i * 12}" font-family="system-ui,sans-serif" font-size="10" font-weight="600" text-anchor="middle" fill="hsl(${hue} 40% 25%)">${l}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="hsl(${hue} 60% 95%)"/>${shape}${text}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Fake data so the app is usable before any API keys are configured. */
export const demoProvider: Provider = {
  name: "Demo data",
  isConfigured: () =>
    process.env.ENABLE_DEMO_PROVIDER === "true" ||
    !(
      process.env.SERPAPI_KEY ||
      process.env.EBAY_CLIENT_ID
    ),

  async search(query) {
    const rand = seeded(query.toLowerCase());
    const base = 20 + Math.floor(rand() * 400);
    const hue = Math.floor(rand() * 360);
    const image = demoImage(query, hue);
    const offers: Offer[] = STORES.map((store, i) => {
      const price = Math.round(base * (0.85 + rand() * 0.35) * 100) / 100;
      const shipping = rand() < 0.6 ? 0 : Math.round(rand() * 1200) / 100;
      return makeOffer({
        id: `demo:${i}`,
        title: `${query} (demo listing)`,
        store,
        url: `https://www.google.com/search?tbm=shop&gl=au&q=${encodeURIComponent(query)}`,
        image,
        currency: REGION.currency,
        price,
        shipping,
        condition: rand() < 0.8 ? "new" : "refurbished",
        provider: "Demo data",
      });
    });
    // An accessory listing, to show the relevance filter in action
    offers.push(
      makeOffer({
        id: "demo:accessory",
        title: `Protective case cover for ${query}`,
        store: "Amazon AU",
        url: "https://www.google.com/",
        image: demoImage("Case", (hue + 180) % 360, "case"),
        currency: REGION.currency,
        price: 9.99,
        shipping: 0,
        condition: "new",
        provider: "Demo data",
      }),
    );
    return offers;
  },
};
