const { createUserClient } = require('../services/supabaseService.js');
async function authenticate(req, res, next, required) {
  const authorization = req.headers.authorization;
  const token = /^Bearer (\S+)$/i.exec(authorization || '')?.[1];
  try {
    if (!token) {
      if (required || authorization) return res.status(401).json({ error: 'Please sign in.' });
      req.db = createUserClient();
      return next();
    }
    const db = createUserClient(token);
    // Verify the token with Auth. Private queries then run under this user's RLS.
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.', code: 'TOKEN_EXPIRED' });
    req.user = data.user;
    req.db = db;
    return next();
  } catch (error) {
    return res.status(error.status || 503).json({ error: 'Authentication service is unavailable.' });
  }
}
module.exports = {
  verifyToken: (req, res, next) => authenticate(req, res, next, true),
  optionalAuth: (req, res, next) => authenticate(req, res, next, false)
};
