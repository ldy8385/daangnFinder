import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.kr.gcp-karroter.net",
      },
    ],
  },
};

export default nextConfig;
