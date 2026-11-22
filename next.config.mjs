const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "frame-src 'self' https://www.youtube-nocookie.com",
  "form-action 'self'",
  "connect-src 'self'",
].join("; ");
const config = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  images: { formats: ["image/webp"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/admin/duzen-onizleme",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp.replace(
              "frame-ancestors 'none'",
              "frame-ancestors 'self'",
            ),
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};
export default config;
