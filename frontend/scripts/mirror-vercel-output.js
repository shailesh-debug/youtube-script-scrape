const fs = require("fs");
const path = require("path");

const source = path.join(process.cwd(), ".next");
const nestedOutput = path.join(process.cwd(), "frontend", ".next");

if (!fs.existsSync(source)) {
  process.exit(0);
}

fs.rmSync(nestedOutput, { recursive: true, force: true });
fs.mkdirSync(path.dirname(nestedOutput), { recursive: true });
fs.cpSync(source, nestedOutput, { recursive: true });
