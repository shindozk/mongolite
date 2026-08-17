import type { MongoDocument } from "../types/database.ts";

export class MongoCursor<T = MongoDocument> {
  private docs: T[];
  private pos = 0;

  constructor(docs: T[]) {
    this.docs = docs;
  }

  hasNext(): boolean {
    return this.pos < this.docs.length;
  }

  next(): T | null {
    if (this.pos < this.docs.length) {
      return this.docs[this.pos++];
    }
    return null;
  }

  toArray(): T[] {
    return [...this.docs];
  }

  skip(n: number): MongoCursor<T> {
    this.pos = Math.max(0, Math.min(this.pos + n, this.docs.length));
    return this;
  }

  limit(n: number): MongoCursor<T> {
    this.docs = this.docs.slice(0, Math.max(0, n));
    return this;
  }

  close(): void {
    this.docs = [];
    this.pos = 0;
  }
}
