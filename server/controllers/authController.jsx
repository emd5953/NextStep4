const { createUserClient } = require('../services/supabaseService.js');
const redirectTo = () => (process.env.CLIENT_URL || 'http://localhost:3000') + '/login';
function respond(res, { data, error }) {
  if (error) return res.status(error.status || 400).json({ error: error.message, message: error.message });
  const user = data.user;
  return res.json({ token: data.session?.access_token, refresh_token: data.session?.refresh_token,
    email: user?.email, full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    message: data.session ? 'Signed in.' : 'Check your email to confirm your account.' });
}
module.exports = {
  signin: async (req, res, next) => { try {
    return respond(res, await createUserClient().auth.signInWithPassword({ email: req.body.email, password: req.body.password }));
  } catch (e) { next(e); } },
  signup: async (req, res, next) => { try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ error: 'Name, email, and password are required.' });
    return respond(res, await createUserClient().auth.signUp({ email, password,
      options: { emailRedirectTo: redirectTo(), data: { full_name, phone } } }));
  } catch (e) { next(e); } },
  googleAuth: async (req, res, next) => { try {
    return respond(res, await createUserClient().auth.signInWithIdToken({ provider: 'google', token: req.body.token }));
  } catch (e) { next(e); } },
  resendVerification: async (req, res, next) => { try {
    const { error } = await createUserClient().auth.resend({ type: 'signup', email: req.body.email, options: { emailRedirectTo: redirectTo() } });
    if (error) return res.status(error.status || 400).json({ error: error.message });
    res.json({ message: 'If confirmation is needed, check your email.' });
  } catch (e) { next(e); } }
};
