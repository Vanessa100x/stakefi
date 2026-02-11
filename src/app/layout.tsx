import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google"; // Modern fonts
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "StakeFi | Reputation-Based Staking",
  description: "Stake on trusted projects, earn rewards, build wallet reputation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
