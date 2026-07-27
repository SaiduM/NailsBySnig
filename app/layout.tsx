import type { Metadata } from "next";
import "./globals.css";
import { PWAController } from "./PWAController";

export const metadata: Metadata = {
  applicationName: "NailsBySnig",
  title: {
    default: "NailsBySnig",
    template: "%s | NailsBySnig",
  },
  description:
    "A private Phoenix nail studio for detailed gel manicures, Gel-X, and custom nail art.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NailsBySnig",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#E75E2E",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/app-icon-192.png",
    apple: [{ url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PWAController />
      </body>
    </html>
  );
}
