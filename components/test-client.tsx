"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Trash2, X, Image, Loader2 } from "lucide-react";
import { Picture } from "@/lib/pictures";

interface TestClientProps {
  initialPictures: Picture[];
  dbError?: string;
}

export default function TestClient({ initialPictures, dbError }: TestClientProps) {
  const [pictures, setPictures] = useState(initialPictures);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>(dbError);
  const [message, setMessage] = useState<string | undefined>();
  const [viewing, setViewing] = useState<Picture | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/pictures");
    if (res.ok) {
      setPictures(await res.json());
      setError(undefined);
    } else {
      setError("Failed to reload pictures.");
    }
  }, []);

  function handleFileChange(file: File | undefined) {
    setError(undefined);
    setMessage(undefined);
    setSelected(file ?? null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleUpload() {
    if (!selected) {
      setError("Please choose an image first.");
      return;
    }
    setUploading(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const res = await fetch("/api/pictures", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Upload failed.");
      }
      setMessage(`Uploaded "${selected.name}" successfully.`);
      setSelected(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(picture: Picture) {
    setDeleting(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const res = await fetch(`/api/pictures/${picture._id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Delete failed.");
      }
      setMessage(`Deleted "${picture.name}".`);
      if (viewing?._id === picture._id) setViewing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          <Upload className="h-5 w-5" aria-hidden="true" />
          Upload a Picture
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-50 hover:file:bg-neutral-700 dark:text-neutral-300 dark:file:bg-neutral-100 dark:file:text-neutral-900 dark:hover:file:bg-neutral-300"
        />
        {preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="Selected preview"
              className="max-h-64 rounded-lg border border-neutral-200 dark:border-neutral-800"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {selected?.name} ({Math.round((selected?.size ?? 0) / 1024)} KB)
            </p>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!selected || uploading}
          className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-50 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            <Image className="h-5 w-5" aria-hidden="true" />
            Review Stored Pictures
          </h2>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {pictures.length} {pictures.length === 1 ? "picture" : "pictures"}
          </span>
        </div>
        {pictures.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <Image className="h-8 w-8 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
            No pictures uploaded yet.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pictures.map((picture) => (
              <li
                key={picture._id}
                className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <button
                  onClick={() => setViewing(picture)}
                  className="block w-full"
                  aria-label={`View ${picture.name}`}
                >
                  <img
                    src={`/api/pictures/${picture._id}`}
                    alt={picture.name}
                    className="aspect-square w-full object-cover"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 p-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="truncate">{picture.name}</span>
                  <button
                    onClick={() => handleDelete(picture)}
                    disabled={deleting}
                    className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-4 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {viewing.name}
              </p>
              <button
                onClick={() => setViewing(null)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Close
              </button>
            </div>
            <img
              src={`/api/pictures/${viewing._id}`}
              alt={viewing.name}
              className="mx-auto max-h-[70vh] w-auto rounded-lg"
            />
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Uploaded {new Date(viewing.createdAt).toLocaleString()} ·{" "}
              {Math.round(viewing.size / 1024)} KB · {viewing.contentType}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
