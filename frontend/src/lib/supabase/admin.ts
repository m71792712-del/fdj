import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/env';

/**
 * Client Supabase « serveur seulement » avec la clé secrète (SUPABASE_SERVICE_ROLE_KEY).
 * Il sert à deux choses uniquement : vérifier une clé d'accès et créer le compte d'un nouvel utilisateur.
 * Ne JAMAIS importer ce fichier depuis un composant client ('use client'). La variable n'a pas le préfixe NEXT_PUBLIC_ :
 * Next.js ne l'envoie donc jamais au navigateur.
 */
export function createServiceClient() {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Variable SUPABASE_SERVICE_ROLE_KEY manquante (voir .env.example).');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
