import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Static route sitemap. Challenge/profile pages are dynamic and chain-backed
 * (no build-time enumeration), so we list the stable, crawlable surfaces.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/explorer", priority: 0.9, changeFrequency: "hourly" },
    { path: "/docs", priority: 0.8, changeFrequency: "weekly" },
    { path: "/leaderboards", priority: 0.7, changeFrequency: "daily" },
    { path: "/create", priority: 0.6, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
