import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Plain object, not `new URL(...)` — Next.js pulls `search` off the URL
    // literally, and a bare "**" URL has no "?", so `new URL(...)` yields
    // `search: ""` and Next then requires an exact-empty query string on
    // every match. That silently rejects any signed Storage URL (they always
    // carry `?token=...`), even though this same pattern matches plain
    // public-bucket URLs fine. Omitting `search` here (pattern.search stays
    // undefined) skips that check entirely, so any query string is allowed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rgsjhlpdcovaszskcigk.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
