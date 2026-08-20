import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://rgsjhlpdcovaszskcigk.supabase.co/storage/v1/object/**")],
  },
};

export default nextConfig;
