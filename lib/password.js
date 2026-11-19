/**
 * Password hashing helper.
 * Uses Node's built-in crypto.scrypt — no external dependency, so the
 * project runs with a plain `npm install` of just express/session/body-parser.
 *
 * Stored format: "<saltHex>:<hashHex>"
 */

const crypto = require("crypto");

const KEY_LEN = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainPassword, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plainPassword, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const hashToCompare = crypto.scryptSync(plainPassword, salt, KEY_LEN);
  const storedHashBuffer = Buffer.from(hash, "hex");
  if (storedHashBuffer.length !== hashToCompare.length) return false;
  return crypto.timingSafeEqual(storedHashBuffer, hashToCompare);
}

module.exports = { hashPassword, verifyPassword };
