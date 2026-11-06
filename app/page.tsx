"use client";

import { FormEvent, useState } from "react";
import type { Offer, SearchResponse } from "@/lib/types";
import ProductImage from "./ProductImage";
import { REGION } from "@/lib/region";

const money = (n: number, currency: string = REGION.currency) =>
  new Intl.NumberFormat(REGION.locale, { style: "currency", currency }).format(n);

function shippingLabel(o: Offer) {
  if (o.shipping === null) return "Shipping not listed";
  if (o.shipping === 0) return "Free shipping";
  return `+ ${money(o.shipping, o.currency)} shipping`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("any");
  const [strict, setStrict] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, condition, strict: String(strict) });
      const res = await fetch(`/api/search?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const lowest = data?.lowest;
  const rest = data?.offers.slice(1) ?? [];
  const savings =
    lowest && data && data.offers.length > 1
      ? data.offers[data.offers.length - 1].total - lowest.total
      : 0;

  return (
    <main className="container">
      <header className="hero">
        <h1>LowestPrice</h1>
        <p>Search for what you want to buy. We'll find the cheapest place to get it in Australia.</p>
      </header>

      <form className="search" onSubmit={onSubmit}>
        <input
          autoFocus
          type="search"
          placeholder="e.g. Sony WH-1000XM5, Dyson V15, AirPods Pro 2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Item to search for"
        />
        <button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "Searching…" : "Find lowest price"}
        </button>
      </form>

      <div className="filters">
        <label>
          Condition{" "}
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="any">Any</option>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />{" "}
          Hide accessories &amp; unlikely matches
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      {data && (
        <>
          <div className="providers">
            {data.providers.map((p) => (
              <span key={p.name} className={`chip ${p.status}`} title={p.message}>
                {p.name}: {p.status === "ok" ? `${p.count} results` : p.status === "skipped" ? "off" : "error"}
              </span>
            ))}
            {data.cached && <span className="chip">cached</span>}
          </div>

          {lowest ? (
            <section className="best">
              <div className="best-label">Lowest price</div>
              <div className="best-body">
                <ProductImage src={lowest.image} size={96} alt={lowest.title} />
                <div className="best-info">
                  <div className="best-price">{money(lowest.total, lowest.currency)}</div>
                  <div className="muted">
                    {money(lowest.price, lowest.currency)} · {shippingLabel(lowest)} · {lowest.condition}
                  </div>
                  <div className="best-title">{lowest.title}</div>
                  <div className="store">
                    at {lowest.store}
                    {lowest.location && <> · ships from {lowest.location}</>}
                  </div>
                  {savings > 0 && (
                    <div className="savings">
                      Saves up to {money(savings, lowest.currency)} vs. the most expensive listing found
                    </div>
                  )}
                </div>
                <a className="buy" href={lowest.url} target="_blank" rel="noopener noreferrer">
                  View deal →
                </a>
              </div>
            </section>
          ) : (
            <div className="empty">
              No matching offers found.
              {data.filteredOut > 0 && " Try unchecking “Hide accessories” to see filtered results."}
            </div>
          )}

          {rest.length > 0 && (
            <section>
              <h2>Other offers ({rest.length})</h2>
              <ul className="offers">
                {rest.map((o) => (
                  <li key={o.id}>
                    <ProductImage src={o.image} size={52} />
                    <div className="offer-info">
                      <div className="offer-title">{o.title}</div>
                      <div className="muted">
                        {o.store}
                        {o.location && <> ({o.location})</>} · {shippingLabel(o)} · {o.condition}
                      </div>
                    </div>
                    <div className="offer-price">
                      <strong>{money(o.total, o.currency)}</strong>
                      <a href={o.url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.filteredOut > 0 && (
            <p className="muted small">
              {data.filteredOut} listing{data.filteredOut === 1 ? "" : "s"} hidden as accessories or unlikely matches.
            </p>
          )}
        </>
      )}
    </main>
  );
}
