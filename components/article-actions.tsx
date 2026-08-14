"use client";

import { useState } from "react";

export default function ArticleActions({
  articleId,
  initialRead,
  initialImportant,
}: {
  articleId: string;
  initialRead: boolean;
  initialImportant: boolean;
}) {
  const [read, setRead] = useState(initialRead);
  const [important, setImportant] = useState(initialImportant);
  const [busy, setBusy] = useState(false);

  const patch = async (updates: object) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/news/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => {
          setImportant(!important);
          patch({ important: !important });
        }}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
          important
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
        }`}
      >
        {important ? "★ Important" : "☆ Mark important"}
      </button>
      <button
        disabled={busy}
        onClick={() => {
          setRead(!read);
          patch({ read: !read });
        }}
        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300"
      >
        {read ? "✓ Read" : "Mark as read"}
      </button>
    </div>
  );
}
