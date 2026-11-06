import type { Offer, Provider } from "../types";
import { REGION } from "../region";
import { makeOffer, normalizeCondition, parseMoney } from "./util";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(signal: AbortSignal): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const creds = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  if (!res.ok) throw new Error(`eBay auth HTTP ${res.status}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/** eBay returns small thumbnails (s-l225); ask its image CDN for a 500px version. */
function largerEbayImage(url?: string) {
  return url?.replace(/\/s-l\d+\./, "/s-l500.");
}

function formatLocation(loc?: { city?: string; stateOrProvince?: string; postalCode?: string }) {
  if (!loc) return undefined;
  const parts = [loc.city, loc.stateOrProvince ?? loc.postalCode].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/** eBay Browse API – fixed-price ("Buy It Now") listings only, no auctions. */
export const ebayProvider: Provider = {
  name: "eBay",
  isConfigured: () => Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),

  async search(query, signal) {
    const token = await getAppToken(signal);
    const params = new URLSearchParams({
      q: query,
      limit: "50",
      filter: `buyingOptions:{FIXED_PRICE},itemLocationCountry:${REGION.country},deliveryCountry:${REGION.country}`,
    });
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": REGION.ebayMarketplace,
          // Shipping costs are estimated to this location
          "X-EBAY-C-ENDUSERCTX": `contextualLocation=${encodeURIComponent(
            `country=${REGION.country}${process.env.POSTCODE ? `,zip=${process.env.POSTCODE}` : ""}`,
          )}`,
        },
      },
    );
    if (!res.ok) throw new Error(`eBay HTTP ${res.status}`);
    const data = await res.json();

    const offers: Offer[] = [];
    for (const item of data.itemSummaries ?? []) {
      const price = parseMoney(item.price?.value);
      if (price == null) continue;
      const shipOpt = item.shippingOptions?.[0];
      const shipping =
        shipOpt?.shippingCostType === "CALCULATED" ? null : parseMoney(shipOpt?.shippingCost?.value);

      offers.push(
        makeOffer({
          id: `ebay:${item.itemId}`,
          title: item.title,
          store: item.seller?.username ? `eBay · ${item.seller.username}` : "eBay",
          url: item.itemWebUrl,
          image: largerEbayImage(item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl),
          currency: item.price?.currency ?? REGION.currency,
          price,
          shipping,
          condition: normalizeCondition(item.condition),
          provider: "eBay",
          location: formatLocation(item.itemLocation),
        }),
      );
    }
    return offers;
  },
};
