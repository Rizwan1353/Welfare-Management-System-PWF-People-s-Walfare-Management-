/**
 * Canonical role list for the organization.
 * Every user account (created manually by an admin) must have a role
 * from this list. No self-signup exists anywhere in the system.
 */

const ROLES = [
  "Chairperson",
  "CEO",
  "Secretary General",
  "Finance Head",
  "Youth Affairs Head",
  "Provincial President",
  "District President",
];

module.exports = { ROLES };
