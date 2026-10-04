import type { NextConfig } from "next";

// Host that will serve product images once a backend exists
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

const nextConfig: NextConfig = {
  typedRoutes: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaHost
      ? [{ protocol: "https", hostname: mediaHost }]
      : [],
  },
};

export default nextConfig;
