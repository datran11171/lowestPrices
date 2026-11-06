import type { Offer, Provider } from "../types";
import { REGION } from "../region";
import { makeOffer, normalizeCondition, parseMoney } from "./util";

/** Google Shopping via SerpApi – aggregates offers from many retailers. */
export const serpApiProvider: Provider = {
  name: "Google Shopping",
  isConfigured: () => Boolean(process.env.SERPAPI_KEY),

  async search(query, signal) {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      gl: REGION.country.toLowerCase(),
      hl: "en",
      google_domain: REGION.googleDomain,
      // Optional, e.g. "Sydney, New South Wales, Australia" for more local results
      ...(process.env.SEARCH_LOCATION ? { location: process.env.SEARCH_LOCATION } : {}),
      api_key: process.env.SERPAPI_KEY!,
    });
    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal });
    if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const offers: Offer[] = [];
    for (const r of data.shopping_results ?? []) {
      const price = parseMoney(r.extracted_price ?? r.price);
      if (price == null) continue;

      // "delivery" looks like "Free delivery" or "$5.99 delivery"
      const delivery = String(r.delivery ?? "").toLowerCase();
      const shipping = delivery.includes("free") ? 0 : parseMoney(delivery);

      offers.push(
        makeOffer({
          title: r.title,
          store: r.source ?? "Unknown store",
          url: r.link ?? r.product_link,
          image: r.serpapi_thumbnail ?? r.thumbnail,
          currency: REGION.currency,
          price,
          shipping,
          condition: r.second_hand_condition ? normalizeCondition(r.second_hand_condition) : "new",
          provider: "Google Shopping",
        }),
      );
    }
    return offers;
  },
};
