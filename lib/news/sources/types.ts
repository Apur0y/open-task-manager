import { NewsSourceId, RawArticle } from "../types";

export interface NewsSourceModule {
  id: NewsSourceId;
  name: string;
  description: string;
  fetch(): Promise<RawArticle[]>;
}
