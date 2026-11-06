import { NextRequest, NextResponse } from "next/server";
import { searchLowestPrice } from "@/lib/search";

const CONDITIONS = ["any", "new", "used", "refurbished"] as const;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "Enter at least 2 characters." }, { status: 400 });
  }
  if (q.length > 200) {
    return NextResponse.json({ error: "Search is too long." }, { status: 400 });
  }

  const conditionParam = params.get("condition") ?? "any";
  const condition = (CONDITIONS as readonly string[]).includes(conditionParam)
    ? (conditionParam as (typeof CONDITIONS)[number])
    : "any";
  const strict = params.get("strict") !== "false";

  try {
    const result = await searchLowestPrice(q, { condition, strict });
    return NextResponse.json(result);
  } catch (err) {
    console.error("search failed", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
