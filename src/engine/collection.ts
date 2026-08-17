import type { MongoDocument, QueryFilter, SortOptions, UpdateOptions, CollectionOptions } from "../types/database.ts";
import { generateObjectId, matchesDocument, sortDocuments, deepClone } from "../lib/helpers.ts";
import { JSONStorageEngine, BinaryStorageEngine, EncryptedStorageEngine, type StorageEngine } from "../storage/index.ts";
import { MongoCursor } from "./cursor.ts";
import { runAggregation, type AggregateStage } from "./aggregate.ts";
import { IndexDef, createIndex, dropIndex } from "./indexes.ts";

export class MongoDBCollection {
  public name: string;
  private docs: MongoDocument[] = [];
  private storage: StorageEngine<{ docs: MongoDocument[] }>;
  private options: CollectionOptions;
  private indexes: IndexDef[] = [];
  private schema?: Record<string, { type: string; required?: boolean }>;

  constructor(name: string, options: CollectionOptions = {}, storagePath?: string) {
    this.name = name;
    this.options = options;
    const filePath = storagePath || `./data/${name}.bson`;
    const defaultData = { docs: [] };
    if (filePath.endsWith(".enc")) {
      this.storage = new EncryptedStorageEngine(filePath, defaultData);
    } else if (filePath.endsWith(".json")) {
      this.storage = new JSONStorageEngine(filePath, defaultData);
    } else {
      this.storage = new BinaryStorageEngine(filePath, defaultData);
    }
    this.load();
  }

  private load(): void {
    const data = this.storage.load();
    this.docs = (data as { docs?: MongoDocument[] }).docs || [];
  }

  private save(): void {
    this.storage.save({ docs: this.docs });
  }

  setSchema(schema: Record<string, { type: string; required?: boolean }>): void {
    this.schema = schema;
  }

  private validateDoc(doc: MongoDocument): boolean {
    if (!this.schema) return true;
    for (const [key, rule] of Object.entries(this.schema)) {
      if (rule.required && (doc[key] === undefined || doc[key] === null)) return false;
      if (doc[key] !== undefined && typeof doc[key] !== rule.type) return false;
    }
    return true;
  }

  insertOne(doc: Partial<MongoDocument>): MongoDocument {
    const newDoc: MongoDocument = {
      _id: doc._id || generateObjectId(),
      ...doc,
      ...({ createdAt: new Date().toISOString() } as Partial<MongoDocument>),
    };
    if (!this.validateDoc(newDoc)) throw new Error("Schema validation failed");
    this.docs.push(newDoc);
    this.save();
    return deepClone(newDoc);
  }

  insertMany(docs: Partial<MongoDocument>[]): MongoDocument[] {
    return docs.map((d) => this.insertOne(d));
  }

  findOne(filter: QueryFilter = {}): MongoDocument | null {
    for (const doc of this.docs) {
      if (matchesDocument(doc, filter)) return deepClone(doc);
    }
    return null;
  }

  find(filter: QueryFilter = {}, sort?: SortOptions, limit?: number): MongoDocument[] {
    let results = this.docs.filter((d) => matchesDocument(d, filter));
    if (sort) results = sortDocuments(results, sort);
    if (limit !== undefined && limit > 0) results = results.slice(0, limit);
    return results.map(deepClone);
  }

  findOneAndUpdate(filter: QueryFilter, update: UpdateOptions, options?: { returnDocument?: "before" | "after"; upsert?: boolean }): MongoDocument | null {
    const returnAfter = options?.returnDocument !== "before";
    for (let i = 0; i < this.docs.length; i++) {
      if (matchesDocument(this.docs[i], filter)) {
        const doc = this.docs[i];
        const before = deepClone(doc);
        if (update.$set) for (const [k, v] of Object.entries(update.$set || {})) doc[k] = v;
        if (update.$unset) for (const k of Object.keys(update.$unset || {})) delete doc[k];
        if (update.$inc) for (const [k, v] of Object.entries(update.$inc || {})) {
          if (typeof doc[k] === "number") doc[k] = (doc[k] as number) + v;
        }
        doc.updatedAt = new Date().toISOString();
        this.docs[i] = doc;
        this.save();
        return returnAfter ? deepClone(doc) : before;
      }
    }
    if (options?.upsert) {
      const newDoc = this.insertOne({ ...update.$set, ...filter } as Partial<MongoDocument>);
      return returnAfter ? newDoc : null;
    }
    return null;
  }

  findOneAndDelete(filter: QueryFilter, options?: { projection?: Record<string, 1> }): MongoDocument | null {
    const index = this.docs.findIndex((d) => matchesDocument(d, filter));
    if (index >= 0) {
      const deleted = this.docs.splice(index, 1)[0];
      this.save();
      return deepClone(deleted);
    }
    return null;
  }

  replaceOne(filter: QueryFilter, replacement: Partial<MongoDocument>, options?: { upsert?: boolean }): { modifiedCount: number; upsertedId?: string } {
    for (let i = 0; i < this.docs.length; i++) {
      if (matchesDocument(this.docs[i], filter)) {
        const newDoc = { ...replacement, _id: this.docs[i]._id };
        this.docs[i] = newDoc as MongoDocument;
        this.save();
        return { modifiedCount: 1 };
      }
    }
    if (options?.upsert) {
      const inserted = this.insertOne({ ...replacement, ...filter } as Partial<MongoDocument>);
      return { modifiedCount: 0, upsertedId: inserted._id };
    }
    return { modifiedCount: 0 };
  }

  bulkWrite(operations: { insertOne?: Partial<MongoDocument>; updateOne?: { filter: QueryFilter; update: UpdateOptions }; deleteOne?: { filter: QueryFilter } }[]): { insertedCount: number; modifiedCount: number; deletedCount: number } {
    let inserted = 0, modified = 0, deleted = 0;
    for (const op of operations) {
      if (op.insertOne) { this.insertOne(op.insertOne); inserted++; }
      else if (op.updateOne) { const r = this.updateOne(op.updateOne.filter, op.updateOne.update); modified += r.modifiedCount || 0; }
      else if (op.deleteOne) { const r = this.deleteOne(op.deleteOne.filter); deleted += r.deletedCount || 0; }
    }
    return { insertedCount: inserted, modifiedCount: modified, deletedCount: deleted };
  }

  updateOne(filter: QueryFilter, update: UpdateOptions): { modifiedCount: number } {
    for (let i = 0; i < this.docs.length; i++) {
      if (matchesDocument(this.docs[i], filter)) {
        const doc = this.docs[i];
        if (update.$set) for (const [k, v] of Object.entries(update.$set || {})) doc[k] = v;
        if (update.$unset) for (const k of Object.keys(update.$unset || {})) delete doc[k];
        if (update.$inc) for (const [k, v] of Object.entries(update.$inc || {})) {
          if (typeof doc[k] === "number") doc[k] = (doc[k] as number) + v;
        }
        doc.updatedAt = new Date().toISOString();
        this.docs[i] = doc;
        this.save();
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
  }

  updateMany(filter: QueryFilter, update: UpdateOptions): { modifiedCount: number } {
    let modified = 0;
    for (let i = 0; i < this.docs.length; i++) {
      if (matchesDocument(this.docs[i], filter)) {
        const doc = this.docs[i];
        if (update.$set) for (const [k, v] of Object.entries(update.$set || {})) doc[k] = v;
        if (update.$unset) for (const k of Object.keys(update.$unset || {})) delete doc[k];
        if (update.$inc) for (const [k, v] of Object.entries(update.$inc || {})) {
          if (typeof doc[k] === "number") doc[k] = (doc[k] as number) + v;
        }
        doc.updatedAt = new Date().toISOString();
        this.docs[i] = doc;
        modified++;
      }
    }
    if (modified > 0) this.save();
    return { modifiedCount: modified };
  }

  deleteOne(filter: QueryFilter): { deletedCount: number } {
    const index = this.docs.findIndex((d) => matchesDocument(d, filter));
    if (index >= 0) {
      this.docs.splice(index, 1);
      this.save();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  deleteMany(filter: QueryFilter): { deletedCount: number } {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matchesDocument(d, filter));
    const deleted = before - this.docs.length;
    if (deleted > 0) this.save();
    return { deletedCount: deleted };
  }

  count(filter: QueryFilter = {}): number {
    return this.docs.filter((d) => matchesDocument(d, filter)).length;
  }

  countDocuments(filter: QueryFilter = {}): number {
    return this.count(filter);
  }

  estimatedDocumentCount(): number {
    return this.docs.length;
  }

  aggregate(pipeline: AggregateStage[]): MongoDocument[] {
    return runAggregation(this.docs, pipeline);
  }

  createIndex(indexDef: IndexDef): void {
    this.indexes = createIndex(this.indexes, indexDef);
  }

  dropIndex(field: string): void {
    this.indexes = dropIndex(this.indexes, field);
  }

  getIndexes(): IndexDef[] {
    return [...this.indexes];
  }

  findAndModify(query: { filter: QueryFilter; update: UpdateOptions; new?: boolean; upsert?: boolean }): MongoDocument | null {
    return this.findOneAndUpdate(query.filter, query.update, { returnDocument: query.new ? "after" : "before", upsert: query.upsert });
  }

  cursor(): MongoCursor<MongoDocument> {
    return new MongoCursor([...this.docs]);
  }

  stats(): { count: number; size: number; avgObjSize: number; storageSize: number } {
    const size = JSON.stringify(this.docs).length;
    return {
      count: this.docs.length,
      size,
      avgObjSize: this.docs.length ? Math.round(size / this.docs.length) : 0,
      storageSize: size,
    };
  }

  distinct(key: string, filter?: QueryFilter): unknown[] {
    const values = new Set<unknown>();
    for (const doc of this.docs) {
      if (!filter || matchesDocument(doc, filter)) {
        if (doc[key] !== undefined) values.add(doc[key]);
      }
    }
    return Array.from(values);
  }

  isCapped(): boolean {
    return !!this.options.capped;
  }

  validate(): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    for (const doc of this.docs) {
      if (!doc._id) errors.push("Document missing _id");
    }
    return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
  }

  watch(pipeline?: any[]): any[] {
    return [{ operationType: "update", fullDocument: this.docs[0] || null }];
  }

  mapReduce(map: string, reduce: string, out?: string): { results: MongoDocument[] } {
    return { results: this.docs.map((d) => ({ ...d, _mapped: true })) };
  }

  drop(): void {
    this.docs = [];
    this.storage.save({ docs: [] });
  }
}
