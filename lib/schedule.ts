import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export interface ScheduleBlock {
  _id: string;
  startMin: number;
  endMin: number;
}

export interface ScheduleBlockInput {
  startMin: number;
  endMin: number;
}

interface MongoScheduleBlock {
  _id: ObjectId;
  startMin: number;
  endMin: number;
}

function toScheduleBlock(doc: MongoScheduleBlock): ScheduleBlock {
  return {
    _id: doc._id.toHexString(),
    startMin: doc.startMin,
    endMin: doc.endMin,
  };
}

function scheduleCollection(): Promise<Collection<MongoScheduleBlock>> {
  return getDb().then((db) =>
    db.collection<MongoScheduleBlock>("scheduleBlocks")
  );
}

export async function getScheduleBlocks(): Promise<ScheduleBlock[]> {
  const col = await scheduleCollection();
  const docs = await col.find().sort({ startMin: 1 }).toArray();
  return docs.map(toScheduleBlock);
}

export function isValidMinute(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 1440
  );
}

export function isValidBlockInput(
  input: unknown
): input is ScheduleBlockInput {
  if (typeof input !== "object" || input === null) return false;
  const { startMin, endMin } = input as { startMin?: unknown; endMin?: unknown };
  return isValidMinute(startMin) && isValidMinute(endMin) && endMin > startMin;
}

export async function addScheduleBlock(
  input: ScheduleBlockInput
): Promise<ScheduleBlock | null> {
  if (!isValidBlockInput(input)) return null;
  const col = await scheduleCollection();
  const doc: MongoScheduleBlock = {
    _id: new ObjectId(),
    startMin: input.startMin,
    endMin: input.endMin,
  };
  await col.insertOne(doc);
  return toScheduleBlock(doc);
}

export async function replaceScheduleBlocks(
  blocks: ScheduleBlockInput[]
): Promise<ScheduleBlock[]> {
  const col = await scheduleCollection();
  const valid = blocks.filter(isValidBlockInput);
  await col.deleteMany({});
  if (valid.length > 0) {
    const docs = valid.map((b) => ({
      _id: new ObjectId(),
      startMin: b.startMin,
      endMin: b.endMin,
    }));
    await col.insertMany(docs);
  }
  return (await col.find().sort({ startMin: 1 }).toArray()).map(
    toScheduleBlock
  );
}

export async function deleteScheduleBlock(id: string): Promise<boolean> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
  const col = await scheduleCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
