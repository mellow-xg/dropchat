import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const font = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unified Inbox",
  description: "WhatsApp, Telegram, Instagram and native chats in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${font.className} bg-zinc-950 text-zinc-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
