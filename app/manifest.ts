import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "solosto",
    short_name: "solosto",
    description: "そろそろ在庫が切れる、を防ぐ在庫リマインダー",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F1",
    theme_color: "#F0883E",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
