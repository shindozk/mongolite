#!/usr/bin/env bun
import { MongoDBLite } from "../engine/database.ts";

const db = new MongoDBLite({ path: "./data" });
const users = db.collection("users");

console.log("mongo-lite CLI - v1.0.0");
console.log("Collections:", db.listCollections());
console.log("Inserted user:", users.insertOne({ name: "Ana", age: 30 }));
console.log("Find:", users.find({ age: { $gte: 25 } }));