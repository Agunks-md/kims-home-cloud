import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kims Home Cloud — Personal Cloud Storage",
  description:
    "Personal Cloud Storage yang menggabungkan beberapa akun Google Drive menjadi satu unified dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
