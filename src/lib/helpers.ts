import type { MongoDocument } from "../types/database.ts";

export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const machine = "mongol".padStart(6, "0");
  const pid = process.pid?.toString(16).padStart(4, "0") ?? "0000";
  const counter = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  return timestamp + machine + pid + counter;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  const clone = {} as Record<string, unknown>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key] as unknown);
    }
  }
  return clone as T;
}

export function matchesDocument(doc: MongoDocument, filter: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$")) {
      if (key === "$or") {
        const conditions = value as Record<string, unknown>[];
        if (!conditions.some((c) => matchesDocument(doc, c))) return false;
      } else if (key === "$and") {
        const conditions = value as Record<string, unknown>[];
        if (!conditions.every((c) => matchesDocument(doc, c))) return false;
      }
      continue;
    }

    if (typeof value === "object" && value !== null && !(value instanceof RegExp)) {
      for (const [op, opValue] of Object.entries(value)) {
        const fieldValue = doc[key];
        switch (op) {
          case "$eq":
            if (fieldValue !== opValue) return false;
            break;
          case "$ne":
            if (fieldValue === opValue) return false;
            break;
          case "$gt":
            if (fieldValue === undefined || !(fieldValue > opValue)) return false;
            break;
          case "$gte":
            if (fieldValue === undefined || !(fieldValue >= opValue)) return false;
            break;
          case "$lt":
            if (fieldValue === undefined || !(fieldValue < opValue)) return false;
            break;
          case "$lte":
            if (fieldValue === undefined || !(fieldValue <= opValue)) return false;
            break;
          case "$in":
            if (!Array.isArray(opValue) || !opValue.includes(fieldValue)) return false;
            break;
          case "$nin":
            if (Array.isArray(opValue) && opValue.includes(fieldValue)) return false;
            break;
          case "$exists":
            const exists = key in doc && doc[key] !== undefined && doc[key] !== null;
            if (exists !== opValue) return false;
            break;
          case "$regex": {
            const regex = opValue instanceof RegExp ? opValue : new RegExp(opValue as string);
            if (typeof fieldValue !== "string" || !regex.test(fieldValue)) return false;
            break;
          }
          default:
            break;
        }
      }
    } else {
      if (doc[key] !== value) return false;
    }
  }
  return true;
}

export function sortDocuments(docs: MongoDocument[], sortOpts: Record<string, 1 | -1>): MongoDocument[] {
  return [...docs].sort((a, b) => {
    for (const [key, dir] of Object.entries(sortOpts)) {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal === bVal) continue;
      if (aVal === undefined || aVal === null) return dir === 1 ? -1 : 1;
      if (bVal === undefined || bVal === null) return dir === 1 ? 1 : -1;
      return dir === 1 ? (aVal > bVal ? 1 : -1) : aVal > bVal ? -1 : 1;
    }
    return 0;
  });
}
