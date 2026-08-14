import { NewsSourceId } from "../types";
import { NewsSourceModule } from "./types";
import { prothomalo } from "./prothomalo";
import { dailystar } from "./dailystar";

export const NEWS_SOURCE_MODULES: NewsSourceModule[] = [prothomalo, dailystar];

export const NEWS_SOURCE_MAP: Record<NewsSourceId, NewsSourceModule> = {
  prothomalo,
  dailystar,
};

export function getSourceModules(ids?: NewsSourceId[]): NewsSourceModule[] {
  if (!ids?.length) return NEWS_SOURCE_MODULES;
  return ids
    .map((id) => NEWS_SOURCE_MAP[id])
    .filter((m): m is NewsSourceModule => Boolean(m));
}
