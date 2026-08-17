import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { MongoDBLite } from "../../src/index.ts";
import { rmSync } from "node:fs";

const TEST_PATH = "./data/test-unit";

describe("MongoDBLite", () => {
  let db: MongoDBLite;

  beforeEach(() => {
    rmSync(TEST_PATH, { recursive: true, force: true });
    db = new MongoDBLite({ path: TEST_PATH });
  });

  afterEach(() => {
    rmSync(TEST_PATH, { recursive: true, force: true });
  });

  test("should insert and find document", () => {
    const col = db.collection("items");
    col.insertOne({ name: "Test" });
    expect(col.count()).toBe(1);
  });

  test("should findOne", () => {
    const col = db.collection("users");
    col.insertOne({ name: "Alice", age: 30 });
    const user = col.findOne({ name: "Alice" });
    expect(user).not.toBeNull();
    expect(user?.age).toBe(30);
  });

  test("should updateOne", () => {
    const col = db.collection("items");
    col.insertOne({ value: 10 });
    col.updateOne({}, { $set: { value: 20 } });
    expect(col.findOne({})?.value).toBe(20);
  });

  test("should deleteOne", () => {
    const col = db.collection("items");
    col.insertOne({ id: 1 });
    col.deleteOne({ id: 1 });
    expect(col.count()).toBe(0);
  });

  test("should aggregate", () => {
    const col = db.collection("sales");
    col.insertMany([{ amount: 100 }, { amount: 200 }]);
    const result = col.aggregate([{ $group: { _id: null, total: { $sum: "amount" } } }]);
    expect(result[0].total).toBe(300);
  });

  test("should create and drop index", () => {
    const col = db.collection("indexed");
    col.createIndex({ field: "name", unique: true });
    expect(col.getIndexes().length).toBe(1);
    col.dropIndex("name");
    expect(col.getIndexes().length).toBe(0);
  });

  test("should handle transactions", () => {
    const txId = db.beginTransaction();
    expect(txId).toBeTruthy();
    expect(db.commitTransaction(txId)).toBe(true);
  });
});