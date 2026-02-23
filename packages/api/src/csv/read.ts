import fs from "fs";
import csvParser from "csv-parser";

export function getFromCSV(path: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on("data", (row: Record<string, string>) => {
        results.push(row);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (err: Error) => {
        reject(err);
      });
  });
}

export function saveToCsv(array: Record<string, any>[], path: string): void {
  if (array.length === 0) {
    throw new Error("Cannot save empty array to CSV");
  }

  const keys = Object.keys(array[0]);
  const header = keys.join(";");
  const rows = array.map((item) => keys.map((key) => item[key]).join(";"));
  const csvString = [header, ...rows].join("\n");
  fs.writeFileSync(path, csvString, "utf8");
}
