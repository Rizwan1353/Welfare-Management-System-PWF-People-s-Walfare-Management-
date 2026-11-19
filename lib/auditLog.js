/**
 * Shared audit logging helper — appends to data/logs.json.
 * Used by every route that needs to record an action: auth (login/logout),
 * projects (create/update), donations (new entry). Public actions (like a
 * donation, which has no session) pass user = null.
 */

const { readAll, writeAll } = require("./db");

function logAction(action, user, details = {}) {
  const logs = readAll("logs");
  logs.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    action,
    userId: user ? user.id : null,
    userEmail: user ? user.email : null,
    details,
    timestamp: new Date().toISOString(),
  });
  writeAll("logs", logs);
}

module.exports = { logAction };
