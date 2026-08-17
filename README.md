# mongo-lite

A lightweight, embedded MongoDB-compatible local database engine built with TypeScript and Bun.js.

> **Disclaimer**: This is a community-driven, non-profit open source project. It is not affiliated with, endorsed by, or licensed from MongoDB, Inc. **MongoDB is a registered trademark of MongoDB, Inc.** This project is a compatible implementation and uses the trademark only nominatively to indicate API compatibility.

## Features

- **Collections & Documents** — insertOne, insertMany, find, findOne
- **Queries** — `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$regex`, `$or`, `$and`
- **Updates** — `$set`, `$unset`, `$inc`
- **Deletes** — deleteOne, deleteMany
- **Aggregation Pipeline** — `$match`, `$group`, `$sort`, `$project`, `$limit`, `$skip`, `$unwind`
- **Indexes** — createIndex, dropIndex, getIndexes
- **Schema Validation** — setSchema, validateDoc
- **Cursor** — hasNext, next, toArray, skip, limit, close
- **Transactions** — beginTransaction, commitTransaction, abortTransaction
- **Admin** — stats, serverStatus, dropDatabase, listCollections, distinct, isCapped, validate
- **Extras** — findOneAndUpdate, findOneAndDelete, replaceOne, bulkWrite, findAndModify, countDocuments, estimatedDocumentCount, watch, mapReduce, renameCollection
- **Storage Engines** — `.json` (readable), `.bson` (compressed zlib, lightweight), `.enc` (AES-256, secure)

## Storage Types

| Extension | Engine | Description |
|-----------|--------|-------------|
| `.json` | JSONStorageEngine | Readable JSON file |
| `.bson` | BinaryStorageEngine | Compressed binary (`zlib`) — smaller and faster |
| `.enc` | EncryptedStorageEngine | Encrypted (`AES-256 CBC`) — secure |

By default, `.collection("name")` creates `.bson`. Use `.enc` by passing the path directly.

## Installation

```bash
npm install @shindozk/mongo-lite
# or
bun add @shindozk/mongo-lite
```

## Usage

```typescript
import { MongoDBLite } from "@shindozk/mongo-lite";

const db = new MongoDBLite({ path: "./data" });
const users = db.collection("users");

users.insertOne({ name: "Alice", age: 30 });
console.log(users.find({ age: { $gte: 25 } }));
```

## Storage Example

```typescript
// Default (.bson — lightweight)
const col = db.collection("items");

// Encrypted (.enc — secure)
const secretCol = db.collection("secrets", {}, "./data/secrets.enc");
```

## CLI

```bash
mongo-lite
```

## Commands

```bash
bun install
bun run dev
bun test
bun start
```

## Project Structure

```
mongo-lite/
├── src/
│   ├── lib/            # Helpers (ObjectId, filters, sort)
│   ├── engine/         # Database, Collection, Cursor, Aggregate, Indexes, Transactions, Admin
│   ├── storage/        # Storage engines (.json, .bson, .enc)
│   ├── types/          # TypeScript interfaces
│   ├── query/          # Query parser
│   ├── cli/            # CLI entry
│   └── index.ts        # Main export
├── examples/           # Example scripts
├── tests/              # Unit and integration tests
├── docs/               # Documentation
├── data/               # Database files
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.