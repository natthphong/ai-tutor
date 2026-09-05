import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Toko-Release",
            value: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=()" },
        ],
      },
    ];
  },
};
export default config;
