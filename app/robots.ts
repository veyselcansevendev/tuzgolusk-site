import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const index =
    process.env.INDEX_PUBLIC_SITE === "true" &&
    process.env.NODE_ENV === "production";
  return {
    rules: {
      userAgent: "*",
      disallow: index ? ["/admin", "/davet", "/api", "/ara"] : ["/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).href,
  };
}
