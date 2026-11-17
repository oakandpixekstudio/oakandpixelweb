import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/_providers/theme-provider";
import { DemoDataProvider } from "@/_providers/demo-data-provider";

export const metadata: Metadata = {
  title: { default: "Oak & Pixel Workspace", template: "%s · Oak & Pixel" },
  description: "Frontend demonstration workspace for Oak & Pixel Studio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><DemoDataProvider>{children}</DemoDataProvider></ThemeProvider></body></html>;
}
