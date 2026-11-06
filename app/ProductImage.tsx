"use client";

import Image from "next/image";
import { useState } from "react";

const REMOTE_HOSTS = [
  /(^|\.)serpapi\.com$/,
  /\.gstatic\.com$/,
  /\.googleusercontent\.com$/,
  /(^|\.)ebayimg\.com$/,
  /\.bbystatic\.com$/,
];

function canOptimize(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && REMOTE_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

/** Product thumbnail with server-side proxying and a placeholder fallback. */
export default function ProductImage({ src, size, alt = "" }: { src?: string; size: number; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (!src || failed) {
    return (
      <div className="img-ph" style={style} aria-hidden>
        <svg viewBox="0 0 24 24" width={size * 0.4} height={size * 0.4} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10" />
        </svg>
      </div>
    );
  }

  // Unknown hosts / data URIs: load directly (no-referrer avoids most hotlink blocks)
  const unoptimized = !canOptimize(src);
  return (
    <Image
      className="product-img"
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={style}
      unoptimized={unoptimized}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
