import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/_providers/theme-provider";
import { DemoDataProvider } from "@/_providers/demo-data-provider";

export const metadata: Metadata = {
  title: { default: "Oak & Pixel Workspace", template: "%s · Oak & Pixel" },
  description: "Frontend demonstration workspace for Oak & Pixel Studio.",
  // Same favicon set as www.oakandpixel.co.za (files in public/images/favicons).
  icons: {
    icon: [
      { url: "/images/favicons/favicon.ico", sizes: "any" },
      { url: "/images/favicons/favicon_32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/images/favicons/favicon_512_apple.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><DemoDataProvider>{children}</DemoDataProvider></ThemeProvider></body></html>;
}
