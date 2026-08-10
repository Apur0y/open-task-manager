import { Binary, Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export interface Picture {
  _id: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface MongoPicture {
  _id: ObjectId;
  name: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: string;
}

interface MongoPictureDoc extends Omit<MongoPicture, "data"> {
  data: Binary | Buffer;
}

function normalizeData(data: Binary | Buffer): Buffer {
  if (Buffer.isBuffer(data)) return data;
  return Buffer.from(data.buffer.subarray(0, data.position));
}

function toPicture(doc: MongoPictureDoc): Picture {
  return {
    _id: doc._id.toHexString(),
    name: doc.name,
    contentType: doc.contentType,
    size: doc.size,
    createdAt: doc.createdAt,
  };
}

export async function getPicturesCollection(): Promise<Collection<MongoPictureDoc>> {
  const db = await getDb();
  return db.collection<MongoPictureDoc>("pictures");
}

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export async function getPictures(): Promise<Picture[]> {
  const col = await getPicturesCollection();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(toPicture);
}

export async function getPicture(id: string): Promise<MongoPicture | null> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  const col = await getPicturesCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return { ...doc, data: normalizeData(doc.data) };
}

export async function createPicture(input: {
  name: string;
  contentType: string;
  size: number;
  data: Buffer;
}): Promise<Picture> {
  const col = await getPicturesCollection();
  const doc: MongoPicture = {
    _id: new ObjectId(),
    name: input.name,
    contentType: input.contentType,
    size: input.size,
    data: input.data,
    createdAt: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return toPicture(doc);
}

export async function deletePicture(id: string): Promise<boolean> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
  const col = await getPicturesCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
