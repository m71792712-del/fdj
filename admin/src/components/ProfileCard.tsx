import { formatDate, userLabel } from '@/lib/utils';
import type { ProfileInfo } from '@/lib/types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-3">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="break-words text-sm text-slate-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

/**
 * Informations du compte. Pour un compte du site, seul le numéro de téléphone existe (l'e-mail du compte est synthétique
 * et n'est pas affiché) ; le nom complet et l'e-mail réels figurent dans chaque demande.
 */
export function ProfileCard({ profile, role, updatedAt }: { profile: ProfileInfo; role?: string; updatedAt?: string }) {
  const siteAccount = profile.last_name.trim() === '-' || profile.last_name.trim() === '';
  const hasLegacy = Boolean(profile.demo_city || profile.demo_color || profile.demo_digit !== null);
  return (
    <>
      <dl className="divide-y divide-slate-100">
        <Row label="Téléphone">{profile.phone || '—'}</Row>
        {!siteAccount && <Row label="Nom">{userLabel(profile)}</Row>}
        {!siteAccount && <Row label="E-mail">{profile.email}</Row>}
        {role && <Row label="Rôle">{role === 'admin' ? 'Administrateur' : 'Utilisateur'}</Row>}
        <Row label="Compte créé le">{formatDate(profile.created_at)}</Row>
        {updatedAt && <Row label="Dernière modification">{formatDate(updatedAt)}</Row>}
      </dl>
      {hasLegacy && (
        <>
          <h3 className="mb-1 mt-4 text-sm font-semibold text-slate-700">Anciennes données de démonstration (fictives)</h3>
          <dl className="divide-y divide-slate-100">
            {profile.demo_city && <Row label="Pays">{profile.demo_city}</Row>}
          </dl>
        </>
      )}
    </>
  );
}
