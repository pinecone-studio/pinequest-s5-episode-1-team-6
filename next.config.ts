import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static site (plain files in out/), hosted on Cloudflare Pages: the app has no server code.
  // (cacheComponents / partialPrefetching from the starter were removed: they need a server.)
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
