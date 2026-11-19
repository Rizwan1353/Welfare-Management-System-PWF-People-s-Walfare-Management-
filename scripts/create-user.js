/**
 * Manual account creation script — the only way to create a user.
 * There is no signup page anywhere in the app.
 *
 * Usage:
 *   node scripts/create-user.js "Full Name" email@pwf.org.pk "PlainPassword" "Role Name" [District]
 *
 * Example:
 *   node scripts/create-user.js "Ayesha Khan" ayesha@pwf.org.pk "Secure@123" "District President" "Hyderabad"
 */

const { readAll, writeAll } = require("../lib/db");
const { hashPassword } = require("../lib/password");
const { ROLES } = require("../lib/roles");

const [, , name, email, password, role, district] = process.argv;

if (!name || !email || !password || !role) {
  console.error(
    "Usage: node scripts/create-user.js \"Full Name\" email@pwf.org.pk \"Password\" \"Role\" [District]"
  );
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Invalid role. Must be one of:\n- ${ROLES.join("\n- ")}`);
  process.exit(1);
}

const users = readAll("users");

if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
  console.error(`A user with email ${email} already exists.`);
  process.exit(1);
}

const newUser = {
  id: "u" + (users.length + 1) + "_" + Date.now().toString(36),
  name,
  email,
  passwordHash: hashPassword(password),
  role,
  district: district || null,
  active: true,
  createdAt: new Date().toISOString(),
};

users.push(newUser);
writeAll("users", users);

console.log(`Created user: ${newUser.name} <${newUser.email}> [${newUser.role}]`);
