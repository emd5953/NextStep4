const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
let admin;
function publicConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw Object.assign(new Error('Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in server/.env.'), { status: 503 });
  let role;
  try { role = JSON.parse(Buffer.from(publishableKey.split('.')[1] || '', 'base64url').toString()).role; } catch {}
  if (!publishableKey.startsWith('sb_publishable_') && role !== 'anon') {
    throw Object.assign(new Error('SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key.'), { status: 503 });
  }
  return { url, publishableKey, googleEnabled: process.env.SUPABASE_GOOGLE_ENABLED === 'true' };
}
function createUserClient(token) {
  const { url, publishableKey } = publicConfig();
  return createClient(url, publishableKey, { auth,
    ...(token ? { global: { headers: { Authorization: 'Bearer ' + token } } } : {}) });
}
function getAdminClient() {
  if (!admin) {
    const { url } = publicConfig();
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw Object.assign(new Error('Configure SUPABASE_SECRET_KEY in server/.env (server only).'), { status: 503 });
    admin = createClient(url, key, { auth });
  }
  return admin;
}
function unwrap(result) {
  if (result.error) throw Object.assign(new Error('Database request failed.'), {
    status: result.error.code === '23505' ? 409 : result.error.code === '42501' ? 403 : 502,
    code: result.error.code
  });
  return result.data;
}
module.exports = { publicConfig, createUserClient, getAdminClient, unwrap };
