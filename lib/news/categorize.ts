import { NewsCategory, RawArticle } from "./types";

interface KeywordRule {
  category: NewsCategory;
  weight: number;
  terms: string[];
}

const RULES: KeywordRule[] = [
  {
    category: "Bangladesh Bank",
    weight: 95,
    terms: [
      "বাংলাদেশ ব্যাংক", "বাংলাদেশ ব্যাংকের", "কেন্দ্রীয় ব্যাংক", "কেন্দ্রীয় ব্যাংক",
      "Bangladesh Bank", "central bank", "গভর্নর", "governor",
      "মুদ্রানীতি", "monetary policy", "রিজার্ভ", "foreign exchange reserve",
      "ডলার রিজার্ভ", "বিবিআইটি", "mps",
    ],
  },
  {
    category: "Banking",
    weight: 80,
    terms: [
      "ব্যাংক", "ব্যাংকের", "ব্যাংকিং", "bank", "banking", "banks",
      "ঋণ", "loan", "liquidity", "তরলতা", "credit", "ক্রেডিট", "ডিপিএস",
      "এফডিআর", "dps", "fdr", "সঞ্চয়", "কিস্তি", "non-performing loan",
      "খেলাপি ঋণ", "banking sector",
    ],
  },
  {
    category: "Inflation",
    weight: 85,
    terms: [
      "মূল্যস্ফীতি", "inflation", "দ্রব্যমূল্য", "consumer price", "সিপিআই",
      "cpi", "মুদ্রাস্ফীতি", "দাম বেড়ে", "দাম বাড়া", "প্রাইস",
    ],
  },
  {
    category: "Interest Rate",
    weight: 85,
    terms: [
      "সুদের হার", "interest rate", "interest rates", "repo", "রেপো",
      "স্মার্ট রেট", "lending rate", "ঋণের সুদ", "সুদহার", "সুদ", "স্মার্ট", "smart rate",
    ],
  },
  {
    category: "Remittance",
    weight: 80,
    terms: [
      "রেমিট্যান্স", "remittance", "প্রবাসী আয়", "প্রবাসী আয়", "প্রবাসী",
      "expatriate", "অভিবাসী", "foreign currency remittance", "ওয়ার্কার",
      "রেমিটেন্স",
    ],
  },
  {
    category: "Export/Import",
    weight: 75,
    terms: [
      "রপ্তানি", "export", "exports", "আমদানি", "import", "imports",
      "বাণিজ্য", "trade", "পণ্য রপ্তানি", "বৈদেশিক বাণিজ্য", "import duty",
      "রপ্তানি আয়", "export earnings",
    ],
  },
  {
    category: "Budget/Tax",
    weight: 80,
    terms: [
      "বাজেট", "budget", "tax", "taxes", "এনবিআর", "nbr",
      "রাজস্ব", "revenue", "ভ্যাট", "vat", "শুল্ক", "customs", "অর্থমন্ত্রী",
      "finance ministry", "অর্থ মন্ত্রণালয়", "new tax", "tax burden",
      "আয়কর", "কর আদায়", "কর হার", "কর বৃদ্ধি", "কর কমানো",
      "কর মওকুফ", "কর রেয়াত", "কর বাড়ানো", "কর ধার্য", "করের বোঝা",
      "কর্পোরেট কর", "মূল্য সংযোজন কর", "ট্যারিফ", "tariff", "অনুদান",
    ],
  },
  {
    category: "IMF/World Bank",
    weight: 80,
    terms: [
      "আইএমএফ", "imf", "বিশ্ব ব্যাংক", "world bank", "এডিবি", "adb",
      "আন্তর্জাতিক মুদ্রা তহবিল", "international monetary fund", "ঋণদাতা",
      "তৃতীয় কিস্তি", "loan installment",
    ],
  },
  {
    category: "Stock Market",
    weight: 75,
    terms: [
      "শেয়ারবাজার", "শেয়ারবাজারে", "শেয়ারবাজারের", "stock market", "ডিএসই",
      "dse", "সিএসই", "cse", "পুঁজিবাজার", "capital market", "শেয়ার", "shares",
      "স্টক", "stock", "বিনিয়োগকারী", "investors", "ট্রেডিং",
    ],
  },
  {
    category: "International Economy",
    weight: 65,
    terms: [
      "যুক্তরাষ্ট্র", "যুক্তরাষ্ট্রের", "মার্কিন", "us economy", "global economy",
      "বৈশ্বিক", "international", "ডলার", "dollar", "oil price", "তেলের দাম",
      "ফেডারেল রিজার্ভ", "fed", "ফেড", "tariff", "ট্রাম্প", "trump", "geopolitics",
      "inflation global", "sanction",
    ],
  },
  {
    category: "Economy",
    weight: 70,
    terms: [
      "অর্থনীতি", "economy", "অর্থনৈতিক", "economic", "জিডিপি", "gdp",
      "প্রবৃদ্ধি", "growth", "ম্যাক্রো", "macro", "বেকারত্ব", "unemployment",
      "বাংলাদেশের অর্থনীতি",
    ],
  },
  {
    category: "Finance",
    weight: 70,
    terms: [
      "অর্থ", "finance", "financial", "মুদ্রা", "currency", "তহবিল", "funding",
      "বিনিয়োগ", "investment", "insurance", "বিমা", "জামানত", "collateral",
      "সোনালী ব্যাংক", "গ্রিনি ব্যাংক", "lender", "ক্ষুদ্রঋণ",
    ],
  },
];

export function extractText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map(extractText).join(" ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("_" in obj) return extractText(obj._);
    return Object.values(obj).map(extractText).join(" ");
  }
  return "";
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBoundaryChar(ch: string | undefined): boolean {
  if (!ch) return true;
  return !/[\p{L}\p{N}]/u.test(ch);
}

export function termMatches(text: string, term: string): boolean {
  if (term.length >= 5) return text.includes(term);
  const lower = text.toLowerCase();
  const needle = term.toLowerCase();
  let idx = lower.indexOf(needle);
  while (idx !== -1) {
    if (isBoundaryChar(idx > 0 ? lower[idx - 1] : undefined) &&
        isBoundaryChar(lower[idx + needle.length])) {
      return true;
    }
    idx = lower.indexOf(needle, idx + 1);
  }
  return false;
}

const CATEGORY_PRIORITY: Record<NewsCategory, number> = {
  "Bangladesh Bank": 12,
  Inflation: 11,
  "Interest Rate": 11,
  "IMF/World Bank": 11,
  Remittance: 10,
  "Budget/Tax": 10,
  Banking: 9,
  "Stock Market": 9,
  "Export/Import": 8,
  Finance: 7,
  "International Economy": 7,
  Economy: 6,
  General: 0,
};

const NEGATIVE_RULES: Partial<Record<NewsCategory, string[]>> = {
  "Budget/Tax": [
    "বাজেট এয়ারলাইনস", "বাজেট এয়ারলাইন্স", "বাজেট এয়ারলাইন",
    "budget airline", "budget airlines", "low-cost", "low cost",
  ],
  "Stock Market": ["stock car", "stock footage"],
  Banking: ["blood bank", "bank holiday"],
};

export function matchScore(text: string): {
  category: NewsCategory;
  score: number;
  matched: string[];
} {
  const lower = text.toLowerCase();
  let best: { category: NewsCategory; score: number; matched: string[] } = {
    category: "General",
    score: 0,
    matched: [],
  };

  for (const rule of RULES) {
    const negativeTerms = NEGATIVE_RULES[rule.category];
    if (negativeTerms?.some((t) => termMatches(lower, t))) continue;
    const matchedTerms: string[] = [];
    for (const term of rule.terms) {
      if (termMatches(lower, term)) {
        matchedTerms.push(term);
      }
    }
    if (matchedTerms.length === 0) continue;

    const score = Math.min(100, rule.weight + (matchedTerms.length - 1) * 5);
    const current =
      best.category === "General"
        ? { category: "General" as NewsCategory, score: 0, matched: [] }
        : best;
    const rulePriority = CATEGORY_PRIORITY[rule.category];
    const currentPriority = CATEGORY_PRIORITY[current.category];

    if (
      rulePriority > currentPriority ||
      (rulePriority === currentPriority &&
        (score > current.score ||
          (score === current.score && matchedTerms.length > current.matched.length)))
    ) {
      best = { category: rule.category, score, matched: matchedTerms };
    }
  }

  return best;
}

const SOURCE_BONUS: Record<string, number> = {
  bangladeshbank: 25,
  imf: 25,
  worldbank: 25,
  ministryoffinance: 20,
  bbs: 15,
};

export function scoreImportance(
  raw: Pick<RawArticle, "title" | "excerpt" | "content" | "source">,
  category: NewsCategory,
  matchedKeywords: string[]
): number {
  const text = `${raw.title} ${raw.excerpt} ${raw.content ?? ""}`.toLowerCase();
  let score = 0;

  const categoryBase: Partial<Record<NewsCategory, number>> = {
    "Bangladesh Bank": 80,
    Banking: 72,
    Inflation: 78,
    "Interest Rate": 78,
    Remittance: 74,
    "Export/Import": 68,
    "Budget/Tax": 74,
    "IMF/World Bank": 76,
    "Stock Market": 66,
    "International Economy": 60,
    Economy: 66,
    Finance: 64,
    General: 20,
  };
  score += categoryBase[category] ?? 20;

  score += Math.min(20, matchedKeywords.length * 4);

  const strongTerms = [
    "bangladesh bank", "বাংলাদেশ ব্যাংক", "monetary policy", "মুদ্রানীতি",
    "inflation", "মূল্যস্ফীতি", "interest rate", "সুদের হার", "repo rate",
    "remittance", "রেমিট্যান্স", "imf", "আইএমএফ", "world bank", "বিশ্ব ব্যাংক",
    "reserve", "রিজার্ভ", "budget", "বাজেট", "gdp", "জিডিপি",
  ];
  score += Math.min(15, strongTerms.filter((t) => text.includes(t)).length * 5);

  const source = raw.source.toLowerCase();
  for (const [key, bonus] of Object.entries(SOURCE_BONUS)) {
    if (source.includes(key)) {
      score += bonus;
      break;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function extractKeyFacts(text: string | null | undefined, max = 3): string[] {
  if (!text) return [];
  const sentences = stripHtml(text)
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 260);
  const factTerms = [
    "%", "টাকা", "taka", "billion", "million", "crore", "কোটি", "লাখ", "লক্ষ",
    "percent", "percentage", "bdt", "usd", "৳", "tk", "বর্ধিত", "কমেছে",
    "বেড়েছে", "বেড়ে", "রেকর্ড", "চুক্তি", "নীতি", "হার", "সংখ্যা", "কোটি",
  ];
  const facts = sentences.filter((s) => factTerms.some((t) => s.toLowerCase().includes(t)));
  return facts.slice(0, max);
}
