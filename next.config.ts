import type { NextConfig } from "next";

// Image hosts used by the price providers. Images are fetched server-side by
// Next's image optimizer, which avoids hotlink/referrer blocking and mixed content.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "serpapi.com" },
      { protocol: "https", hostname: "**.gstatic.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "i.ebayimg.com" },
      { protocol: "https", hostname: "**.ebayimg.com" },
      { protocol: "https", hostname: "**.bbystatic.com" },
    ],
  },
};

export default nextConfig;
