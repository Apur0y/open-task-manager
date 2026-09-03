"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  formatDuration,
  isoToLocalInputValue,
  localInputValueToIso,
  todayString,
} from "@/lib/types";

export default function AddSessionForm({
  date,
  busy,
  onSave,
  onCancel,
}: {
  date: string;
  busy: boolean;
  onSave: (startIso: string, endIso: string) => Promise<void>;
  onCancel: () => void;
}) {
  const defaults = useMemo(() => {
    const isToday = date === todayString();
    if (isToday) {
      const now = new Date();
      return {
        start: isoToLocalInputValue(
          new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        ),
        end: isoToLocalInputValue(now.toISOString()),
      };
    }
    return { start: `${date}T09:00`, end: `${date}T10:00` };
  }, [date]);

  const [startValue, setStartValue] = useState(defaults.start);
  const [endValue, setEndValue] = useState(defaults.end);
  const [localError, setLocalError] = useState<string | undefined>();

  const previewDuration = useMemo(() => {
    const s = localInputValueToIso(startValue);
    const e = localInputValueToIso(endValue);
    if (!s || !e) return null;
    const seconds = Math.round((Date.parse(e) - Date.parse(s)) / 1000);
    return seconds > 0 ? seconds : null;
  }, [startValue, endValue]);

  const handleSave = async () => {
    const startIso = localInputValueToIso(startValue);
    const endIso = localInputValueToIso(endValue);
    if (!startIso || !endIso) {
      setLocalError("Both start and end times are required.");
      return;
    }
    if (previewDuration === null) {
      setLocalError("End time must be after start time.");
      return;
    }
    setLocalError(undefined);
    await onSave(startIso, endIso);
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-emerald-500/60 bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Start
          </span>
          <input
            type="datetime-local"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            End
          </span>
          <input
            type="datetime-local"
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
      </div>
      <div className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
        {previewDuration !== null ? (
          <>
            Duration:{" "}
            <span className="font-bold text-neutral-900 dark:text-neutral-100">
              {formatDuration(previewDuration)}
            </span>
          </>
        ) : (
          <span className="text-red-600 dark:text-red-400">Invalid time range</span>
        )}
      </div>
      {localError && (
        <p className="text-xs text-red-600 dark:text-red-400">{localError}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || previewDuration === null}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition-transform duration-100 hover:bg-emerald-500 active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy ? "Adding…" : "Add session"}
        </button>
      </div>
    </div>
  );
}
