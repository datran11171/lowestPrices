export type Condition = "new" | "used" | "refurbished" | "unknown";

export interface Offer {
  id: string;
  title: string;
  store: string;
  url: string;
  image?: string;
  currency: string;
  price: number;
  /** null = shipping cost unknown */
  shipping: number | null;
  /** price + shipping (shipping treated as 0 when unknown) */
  total: number;
  condition: Condition;
  provider: string;
  /** Where the item ships from, when the source says (e.g. "Sydney, NSW") */
  location?: string;
}

export interface ProviderStatus {
  name: string;
  status: "ok" | "error" | "skipped";
  count: number;
  message?: string;
}

export interface SearchResponse {
  query: string;
  offers: Offer[];
  lowest: Offer | null;
  providers: ProviderStatus[];
  /** Offers removed by relevance / outlier filtering */
  filteredOut: number;
  cached: boolean;
}

export interface Provider {
  name: string;
  isConfigured(): boolean;
  search(query: string, signal: AbortSignal): Promise<Offer[]>;
}
