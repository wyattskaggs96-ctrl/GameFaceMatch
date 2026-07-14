import type { NextConfig } from "next";

const productionScriptSource =
  process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline';" : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; ${productionScriptSource} style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; manifest-src 'self';`
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=()"
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
