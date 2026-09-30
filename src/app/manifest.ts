import type { MetadataRoute } from "next";

/** PWA manifest: the first step toward installable/native-feeling mobile use. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IQRAFI",
    short_name: "IQRAFI",
    description: "Read. Complete. Together.",
    start_url: "/home",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#0a3f30",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
