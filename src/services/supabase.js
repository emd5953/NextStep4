import { createClient } from '@supabase/supabase-js';
import { API_SERVER } from '../config';
let clientPromise;
let configPromise;
export function getAuthConfig() {
  if (!configPromise) configPromise = fetch(API_SERVER + '/auth/config', { signal: AbortSignal.timeout(10000) }).then(async response => {
    if (!response.ok) throw new Error('Supabase setup is not complete yet.');
    return response.json();
  }).catch(error => { configPromise = null; throw error; });
  return configPromise;
}
export function getSupabase() {
  if (!clientPromise) clientPromise = getAuthConfig()
    .then(({ url, publishableKey }) => {
      return createClient(url, publishableKey);
    }).catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
