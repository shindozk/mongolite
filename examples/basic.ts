import { MongoDBLite } from "../src/index.ts";

const db = new MongoDBLite({ path: "./data/example" });
const products = db.collection("products");

products.insertMany([
  { name: "Notebook", price: 3500, category: "tech" },
  { name: "Mouse", price: 150, category: "tech" },
]);

console.log("Products:", products.find({ category: "tech" }));
console.log("Count:", products.count());
