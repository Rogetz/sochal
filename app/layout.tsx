import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/sochal/Header";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sochal — Live Battles on Solana",
  description: "Talent/social/skill based live battles on Solana. Talent earns instantly, skill matches skill, payout secured and decentralized.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black antialiased">
        <Providers>
          <Header />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}