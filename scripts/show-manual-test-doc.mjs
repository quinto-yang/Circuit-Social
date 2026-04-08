import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve(process.cwd(), "docs/testing/manual-regression.md");
const content = fs.readFileSync(filePath, "utf8");

process.stdout.write(content);
