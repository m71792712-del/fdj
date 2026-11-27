import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';

// La racine n'a pas de page d'accueil : elle envoie vers l'espace (si connecté) ou la connexion.
export default async function Home() {
  redirect((await getUser()) ? '/espace' : '/login');
}
