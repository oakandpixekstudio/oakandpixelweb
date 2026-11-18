import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oak & Pixel Workspace",
    short_name: "Oak & Pixel",
    description: "Internal CRM for Oak & Pixel Studio.",
    start_url: "/overview",
    scope: "/",
    display: "standalone",
    background_color: "#071218",
    theme_color: "#071218",
    icons: [
      { src: "/images/favicons/favicon_256.png", sizes: "256x256", type: "image/png" },
      { src: "/images/favicons/favicon_512_apple.png", sizes: "512x512", type: "image/png" },
      { src: "/images/favicons/favicon_512_apple.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
