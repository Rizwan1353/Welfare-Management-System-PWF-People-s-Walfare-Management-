/**
 * JSON-based Database Service
 * Treats each *.json file in /data as a "collection". Synchronous and
 * file-based on purpose — this is the single place that knows how to
 * read/write those files safely (auto ids, timestamps).
 *
 * Used by every module's routes. Full CRUD helpers land in Step 5
 * (District Management) when the first real collection is wired up.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readAll(collection) {
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) return [];
  const raw = fs.readFileSync(fp, "utf8").trim();
  return raw ? JSON.parse(raw) : [];
}

function writeAll(collection, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

module.exports = {
  readAll,
  writeAll,
};
