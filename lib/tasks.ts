import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import {
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
} from "./types";

export interface MongoTask {
  _id: ObjectId;
  title: string;
  description: string;
  assignedDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

function toTask(doc: MongoTask): Task {
  return {
    _id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description,
    assignedDate: doc.assignedDate,
    status: doc.status,
    priority: doc.priority,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getTasksCollection(): Promise<Collection<MongoTask>> {
  const db = await getDb();
  return db.collection<MongoTask>("tasks");
}

function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function getTasks(): Promise<Task[]> {
  const col = await getTasksCollection();
  const docs = await col.find({}).toArray();
  return docs.map(toTask);
}

export async function createTask(input: TaskInput): Promise<Task> {
  const col = await getTasksCollection();
  const now = new Date().toISOString();
  const doc: MongoTask = {
    _id: new ObjectId(),
    title: input.title.trim(),
    description: input.description,
    assignedDate: input.assignedDate,
    status: "pending",
    priority: input.priority,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return toTask(doc);
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<MongoTask, "title" | "description" | "assignedDate" | "status" | "priority">>
): Promise<Task | null> {
  if (!isValidId(id)) return null;
  const col = await getTasksCollection();
  const set: Partial<MongoTask> = { ...updates, updatedAt: new Date().toISOString() };
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" }
  );
  return doc ? toTask(doc) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  if (!isValidId(id)) return false;
  const col = await getTasksCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
