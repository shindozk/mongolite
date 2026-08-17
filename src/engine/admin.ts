import { MongoDBCollection } from "./collection.ts";

export function createCollection(
  db: any,
  name: string,
  options?: { capped?: boolean; size?: number; max?: number }
): MongoDBCollection {
  return db.collection(name, options || {});
}

export function renameCollection(
  db: any,
  oldName: string,
  newName: string
): boolean {
  const oldCol = db.listCollections().find((n: string) => n === oldName);
  if (!oldCol) return false;
  const col = (db as any).collections.get(oldName);
  if (!col) return false;
  (db as any).collections.delete(oldName);
  col.name = newName;
  (db as any).collections.set(newName, col);
  return true;
}
