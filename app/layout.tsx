import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LowestPrice – find the best deal",
  description: "Search an item and find the lowest price across stores.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
