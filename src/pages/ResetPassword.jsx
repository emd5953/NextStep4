import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../services/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { error } = await (await getSupabase()).auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setMessage('Password updated. You can return to NextStep.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }
  return <section className="container">
    <h1>Set a new password</h1>
    <p>Open the reset link in your email before using this form.</p>
    <form onSubmit={submit}>
      <label>New password <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button>
    </form>
    <p role="status">{message}</p><Link to="/">Return to NextStep</Link>
  </section>;
}
