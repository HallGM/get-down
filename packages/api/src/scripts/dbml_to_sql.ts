/**
 * Reads schema.dbml from the workspace root and prints
 * the equivalent PostgreSQL CREATE statements to stdout.
 *
 * Usage:
 *   pnpm tsx src/scripts/dbml_to_sql.ts
 *   pnpm tsx src/scripts/dbml_to_sql.ts > output.sql
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { exporter } from "@dbml/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve relative to the monorepo root (4 levels up from src/scripts/)
const schemaPath = resolve(__dirname, "../../../../schema.dbml");

const dbml = readFileSync(schemaPath, "utf-8");
const sql = exporter.export(dbml, "postgres");

const outputArg = process.argv[2];

if (outputArg) {
  const outputPath = resolve(process.cwd(), outputArg);
  writeFileSync(outputPath, sql, "utf-8");
  console.log(`SQL written to ${outputPath}`);
} else {
  console.log(sql);
}
