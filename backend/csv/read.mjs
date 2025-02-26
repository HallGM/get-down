import fs from "fs";
import csvParser from "csv-parser";

export function getFromCSV(path) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csvParser())
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// 1. Convert object list to CSV string
export function saveToCsv(array, path) {
  const keys = Object.keys(array[0]); // Get the keys (column headers)
  const header = keys.join(";"); // CSV header
  const rows = array.map((item) => keys.map((key) => item[key]).join(";"));
  const csvString = [header, ...rows].join("\n");
  fs.writeFileSync(path, csvString, "utf8");
}

// 4. Node.js: Write to file
