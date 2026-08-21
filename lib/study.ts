import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { StudySession } from "./types";

export const DEFAULT_USER_ID = "default";

interface MongoStudySession {
  _id: ObjectId;
  userId: string;
  startAt: string;
  endAt: string | null;
  durationSeconds: number | null;
  localDate: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

function toStudySession(doc: MongoStudySession): StudySession {
  return {
    _id: doc._id.toHexString(),
    userId: doc.userId,
    startAt: doc.startAt,
    endAt: doc.endAt,
    durationSeconds: doc.durationSeconds,
    localDate: doc.localDate,
    timezone: doc.timezone,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

let indexesPromise: Promise<unknown> | undefined;

export async function getStudySessionsCollection(): Promise<
  Collection<MongoStudySession>
> {
  const db = await getDb();
  const col = db.collection<MongoStudySession>("studySessions");
  if (!indexesPromise) {
    indexesPromise = col.createIndex(
      { userId: 1 },
      { unique: true, partialFilterExpression: { endAt: null } }
    );
    indexesPromise.catch(() => {
      indexesPromise = undefined;
    });
  }
  return col;
}

export function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function localDateInTz(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function todayInTz(timeZone: string): string {
  return localDateInTz(new Date(), timeZone);
}

export async function getPreferredTimezone(): Promise<string> {
  const col = await getStudySessionsCollection();
  const doc = await col.findOne(
    {},
    { sort: { createdAt: -1 }, projection: { timezone: 1 } }
  );
  return doc?.timezone ?? "UTC";
}

export async function getActiveSession(
  userId: string = DEFAULT_USER_ID
): Promise<StudySession | null> {
  const col = await getStudySessionsCollection();
  const doc = await col.findOne({ userId, endAt: null });
  return doc ? toStudySession(doc) : null;
}

export async function startSession(timezone: string): Promise<StudySession> {
  const col = await getStudySessionsCollection();
  const now = new Date();
  const nowIso = now.toISOString();
  const doc: MongoStudySession = {
    _id: new ObjectId(),
    userId: DEFAULT_USER_ID,
    startAt: nowIso,
    endAt: null,
    durationSeconds: null,
    localDate: localDateInTz(now, timezone),
    timezone,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await col.insertOne(doc);
  return toStudySession(doc);
}

export async function stopActiveSession(
  userId: string = DEFAULT_USER_ID
): Promise<StudySession | null> {
  const active = await getActiveSession(userId);
  if (!active) return null;
  return stopSessionById(active._id);
}

export async function stopSessionById(id: string): Promise<StudySession | null> {
  if (!isValidId(id)) return null;
  const col = await getStudySessionsCollection();
  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing || existing.endAt !== null) return null;

  const end = new Date();
  const endIso = end.toISOString();
  const durationSeconds = Math.max(
    0,
    Math.round((end.getTime() - new Date(existing.startAt).getTime()) / 1000)
  );
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id), endAt: null },
    {
      $set: {
        endAt: endIso,
        durationSeconds,
        updatedAt: endIso,
      },
    },
    { returnDocument: "after" }
  );
  return doc ? toStudySession(doc) : null;
}

export async function discardActiveSession(
  userId: string = DEFAULT_USER_ID
): Promise<boolean> {
  const active = await getActiveSession(userId);
  if (!active) return false;
  return deleteSession(active._id);
}

export async function getSessionsBetween(
  from: string,
  to: string,
  userId: string = DEFAULT_USER_ID
): Promise<StudySession[]> {
  const col = await getStudySessionsCollection();
  const docs = await col
    .find({ userId, localDate: { $gte: from, $lte: to } })
    .sort({ startAt: 1 })
    .toArray();
  return docs.map(toStudySession);
}

export async function getAllSessions(
  userId: string = DEFAULT_USER_ID
): Promise<StudySession[]> {
  const col = await getStudySessionsCollection();
  const docs = await col
    .find({ userId })
    .sort({ startAt: -1 })
    .toArray();
  return docs.map(toStudySession);
}

export interface UpdateSessionInput {
  startAt?: string;
  endAt?: string | null;
}

export async function updateSessionTimes(
  id: string,
  updates: UpdateSessionInput
): Promise<StudySession | null> {
  if (!isValidId(id)) return null;
  const col = await getStudySessionsCollection();
  const existing = await col.findOne({ _id: new ObjectId(id) });
  if (!existing) return null;

  const startAt = updates.startAt ?? existing.startAt;
  const endAt =
    updates.endAt === undefined ? existing.endAt : updates.endAt;
  const startMs = new Date(startAt).getTime();
  const endMs = endAt === null ? null : new Date(endAt).getTime();
  if (endMs !== null && endMs <= startMs) return null;

  const set: Partial<MongoStudySession> = {
    startAt,
    endAt,
    updatedAt: new Date().toISOString(),
  };
  if (endMs === null) {
    set.durationSeconds = null;
    set.localDate = localDateInTz(new Date(startAt), existing.timezone);
  } else {
    set.durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
    set.localDate = localDateInTz(new Date(startAt), existing.timezone);
  }

  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" }
  );
  return doc ? toStudySession(doc) : null;
}

export async function deleteSession(id: string): Promise<boolean> {
  if (!isValidId(id)) return false;
  const col = await getStudySessionsCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
