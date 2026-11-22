import { clubName } from "@/lib/format";
import { siteUrl } from "@/lib/auth";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  metadataBase: siteUrl(),
  title: { default: clubName, template: "%s | " + clubName },
  description: "Eskil Tuzgölü Belediye Spor resmî web sitesi",
  robots: {
    index:
      process.env.INDEX_PUBLIC_SITE === "true" &&
      process.env.NODE_ENV === "production",
    follow: true,
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
