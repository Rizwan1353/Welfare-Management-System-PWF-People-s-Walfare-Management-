/**
 * Auth middleware.
 * requireLogin  — blocks the request unless a session user exists.
 * requireRole   — blocks the request unless the session user's role is
 *                  in the allowed list. Call with no args to allow any
 *                  logged-in role.
 */

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }
    if (roles.length > 0 && !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Access denied for this role" });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
