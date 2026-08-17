import type { MongoDocument } from "../types/database.ts";
import { matchesDocument, sortDocuments } from "../lib/helpers.ts";

export interface AggregateStage {
  $match?: Record<string, unknown>;
  $group?: { _id: unknown; count?: { $sum: number }; total?: { $sum: string | number } };
  $sort?: Record<string, 1 | -1>;
  $project?: Record<string, 1 | 0>;
  $limit?: number;
  $skip?: number;
  $unwind?: string;
}

export function runAggregation(docs: MongoDocument[], pipeline: AggregateStage[]): MongoDocument[] {
  let results = [...docs];
  for (const stage of pipeline) {
    if (stage.$match) {
      results = results.filter((d) => matchesDocument(d, stage.$match!));
    } else if (stage.$sort) {
      results = sortDocuments(results, stage.$sort);
    } else if (stage.$limit && typeof stage.$limit === "number") {
      results = results.slice(0, stage.$limit);
    } else if (stage.$skip && typeof stage.$skip === "number") {
      results = results.slice(stage.$skip);
    } else if (stage.$project) {
      const proj = stage.$project;
      results = results.map((d) => {
        const newDoc: MongoDocument = { _id: d._id };
        for (const [k, v] of Object.entries(proj!)) {
          if (v) newDoc[k] = d[k];
        }
        return newDoc;
      });
    } else if (stage.$group) {
      const group = stage.$group;
      const groups: Map<string, MongoDocument[]> = new Map();
      for (const doc of results) {
        const key = JSON.stringify(group._id !== undefined ? doc[group._id as string] : doc);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(doc);
      }
      results = [];
      for (const [, docsArr] of groups) {
        const aggDoc: MongoDocument = { _id: docsArr[0][group._id as string] || null };
        if (group.count) aggDoc.count = docsArr.length;
        if (group.total) aggDoc.total = docsArr.reduce((sum, d) => sum + (Number(d[group.total?.$sum as string]) || 0), 0);
        results.push(aggDoc);
      }
    }
  }
  return results;
}
