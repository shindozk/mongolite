import { MongoDBCollection } from "./collection.ts";
import { TransactionManager } from "./transactions.ts";
import type { DatabaseConfig, CollectionOptions } from "../types/database.ts";

export class MongoDBLite {
  private collections: Map<string, MongoDBCollection> = new Map();
  private config: DatabaseConfig;
  private storagePath: string;
  private txManager = new TransactionManager();

  constructor(config: DatabaseConfig = { path: "./data" }) {
    this.config = config;
    this.storagePath = config.path;
  }

  collection(name: string, options?: CollectionOptions, filePath?: string): MongoDBCollection {
    if (this.collections.has(name)) return this.collections.get(name)!;
    const storageFile = filePath || `${this.storagePath}/${name}.bson`;
    const col = new MongoDBCollection(name, options || {}, storageFile);
    this.collections.set(name, col);
    return col;
  }

  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }

  dropDatabase(): void {
    for (const col of this.collections.values()) {
      col.drop();
    }
    this.collections.clear();
  }

  beginTransaction(): string {
    return this.txManager.begin();
  }

  commitTransaction(id: string): boolean {
    return this.txManager.commit(id);
  }

  abortTransaction(id: string): boolean {
    return this.txManager.abort(id);
  }

  serverStatus(): { version: string; uptime: number; collections: number; storagePath: string } {
    return {
      version: "1.0.0",
      uptime: process.uptime ? Math.round(process.uptime()) : 0,
      collections: this.collections.size,
      storagePath: this.storagePath,
    };
  }
}
