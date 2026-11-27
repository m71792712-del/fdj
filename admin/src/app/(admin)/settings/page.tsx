import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BalanceForm, SettingForm } from '@/components/Forms';
import { PageHeader } from '@/components/ui';
import { BALANCE_CURRENCIES, type DisplayedBalance } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

export const metadata = { title: 'Réglages' };

const FIELDS = [
  { key: 'loans_per_hour', label: 'Demandes autorisées par heure et par utilisateur', hint: 'Entier de 1 à 100 (défaut 5).' },
  { key: 'suggestions_per_day', label: 'Nouvelles banques suggérées par jour et par utilisateur', hint: 'Entier de 1 à 50.' },
];

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from('app_settings').select('key,value');
  const map = new Map<string, unknown>((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const mfa = map.get('require_admin_mfa') === true;

  // Solde affiché à tous les comptes (valeur de repli : 0 EUR, comme get_displayed_balance()).
  const raw = map.get('displayed_balance') as Partial<DisplayedBalance> | undefined;
  const balance: DisplayedBalance = {
    amount: typeof raw?.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : 0,
    currency: (BALANCE_CURRENCIES as readonly string[]).includes(raw?.currency ?? '') ? (raw!.currency as string) : 'EUR',
  };

  return (
    <>
      <PageHeader title="Réglages" subtitle="Paramètres validés et audités par la base de données" />
      <div className="grid max-w-3xl gap-5">
        <section className="card" aria-labelledby="balance">
          <h2 id="balance" className="text-sm font-medium text-slate-700">Solde disponible affiché aux utilisateurs</h2>
          <p className="mt-1 text-sm">Valeur actuelle : <strong>{formatMoney(balance.amount, balance.currency)}</strong> — identique pour tous les comptes (montant fictif).</p>
          <div className="mt-3"><BalanceForm amount={balance.amount} currency={balance.currency} /></div>
        </section>
        {FIELDS.map((f) => (
          <section key={f.key} className="card">
            <SettingForm settingKey={f.key} label={f.label} hint={f.hint} value={String(map.get(f.key) ?? '')} />
          </section>
        ))}
        <section className="card">
          <h2 className="text-sm font-medium text-slate-700">Double authentification obligatoire pour l’admin</h2>
          <p className="mt-1 text-sm">État actuel : <strong>{mfa ? 'activée' : 'désactivée'}</strong></p>
          <p className="mt-2 text-xs text-slate-500">Non modifiable ici : l’activer sans avoir enrôlé de TOTP vous bloquerait. Voir backend/docs/SECURITY.md.</p>
        </section>
      </div>
    </>
  );
}
