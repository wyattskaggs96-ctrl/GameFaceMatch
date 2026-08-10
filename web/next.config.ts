import type { NextConfig } from "next";

const productionScriptSource =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";
const connectSource =
  process.env.NODE_ENV === "production" ? "connect-src 'self';" : "connect-src 'self' ws://localhost:* ws://127.0.0.1:*;";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' blob: data:; media-src 'self' blob:; ${connectSource} ${productionScriptSource} style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; manifest-src 'self';`
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=()"
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
        ]
      }
    ];
  }
};

export default nextConfig;
