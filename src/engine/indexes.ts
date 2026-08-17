import type { MongoDocument } from "../types/database.ts";

export interface IndexDef {
  field: string;
  unique?: boolean;
  sparse?: boolean;
}

export function createIndex(indexes: IndexDef[], def: IndexDef): IndexDef[] {
  if (!indexes.find((i) => i.field === def.field)) {
    indexes.push({ ...def });
  }
  return indexes;
}

export function dropIndex(indexes: IndexDef[], field: string): IndexDef[] {
  return indexes.filter((i) => i.field !== field);
}
