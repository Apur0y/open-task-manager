import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleActions from "@/components/article-actions";
import { getNewsById } from "@/lib/news/store";

export const dynamic = "force-dynamic";

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getNewsById(id);
  return {
    title: article ? article.title : "Article not found",
    description: article?.excerpt || "News article",
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function importanceColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200";
  if (score >= 60) return "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200";
  if (score >= 40) return "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const article = await getNewsById(id);
  if (!article) notFound();

  const paragraphs = article.content
    ? article.content
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/news"
        className="mb-4 inline-block text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        ← Back to news
      </Link>

      <article>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {article.sourceName}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {article.category}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${importanceColor(article.importance)}`}
            title="Importance score (0-100)"
          >
            Importance: {article.importance}/100
          </span>
        </div>

        <h1 className="text-2xl font-bold leading-snug text-neutral-900 dark:text-neutral-100">
          {article.title}
        </h1>

        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Published {formatDate(article.publishedAt)} · Collected{" "}
          {formatDate(article.collectedAt)}
        </p>

        {article.image ? (
          <img
            src={article.image}
            alt=""
            className="mt-5 w-full rounded-xl object-cover"
          />
        ) : null}

        {article.excerpt ? (
          <p className="mt-5 text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
            {article.excerpt}
          </p>
        ) : null}

        {paragraphs.length > 0 && (
          <div className="mt-4 space-y-4">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-base leading-relaxed text-neutral-700 dark:text-neutral-300"
              >
                {p}
              </p>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <ArticleActions
            articleId={article._id}
            initialRead={article.read}
            initialImportant={article.important}
          />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Read original article ↗
          </a>
        </div>
      </article>
    </main>
  );
}
