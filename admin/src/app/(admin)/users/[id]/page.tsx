import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProfileCard } from '@/components/ProfileCard';
import { DeleteUserForm } from '@/components/Forms';
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { STATUS_LABELS, type LoanListRow, type ProfileInfo } from '@/lib/types';
import { formatDate, userLabel, UUID_RE } from '@/lib/utils';

export const metadata = { title: 'Profil utilisateur' };

type Profile = ProfileInfo & { id: string; role: string; updated_at: string };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: p }, { data: loans }] = await Promise.all([
    supabase.from('profiles').select('id,first_name,last_name,email,phone,role,demo_color,demo_city,demo_digit,created_at,updated_at').eq('id', id).maybeSingle(),
    supabase
      .from('loan_requests')
      .select('id,full_name,contact_email,purpose_code,custom_bank_name,status,created_at,banks(name),loan_purposes(label_fr)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (!p) notFound();
  const profile = p as unknown as Profile;
  const requests = (loans ?? []) as unknown as LoanListRow[];

  const counts: Record<string, number> = {};
  requests.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });

  return (
    <>
      <p className="mb-3 text-sm"><Link href="/users" className="text-ocean-600 hover:underline">← Retour aux utilisateurs</Link></p>
      <PageHeader title={userLabel(profile)} subtitle={profile.phone || (profile.role === 'admin' ? profile.email : undefined)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-1" aria-labelledby="info">
          <h2 id="info" className="mb-2 text-xl">Compte</h2>
          <ProfileCard profile={profile} role={profile.role} updatedAt={profile.updated_at} />
        </section>

        <section className="space-y-4 lg:col-span-2" aria-labelledby="loans">
          <div className="card">
            <h2 id="loans" className="mb-3 text-xl">Demandes de financement ({requests.length})</h2>
            {requests.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.keys(STATUS_LABELS).filter((k) => counts[k]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs">
                    <StatusBadge status={k} /> {counts[k]}
                  </span>
                ))}
              </div>
            )}
            {requests.length === 0 ? (
              <EmptyState text="Cet utilisateur n’a déposé aucune demande." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100"><tr><th className="th">Nom complet</th><th className="th">Email</th><th className="th">Banque</th><th className="th">Statut</th><th className="th">Date</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-lagoon-50/40">
                        <td className="td"><Link className="font-medium text-ocean-600 hover:underline" href={`/requests/${r.id}`}>{r.full_name || r.loan_purposes?.label_fr || '—'}</Link></td>
                        <td className="td">{r.contact_email || '—'}</td>
                        <td className="td">{r.banks?.name ?? (r.custom_bank_name ? `${r.custom_bank_name} (autre)` : '—')}</td>
                        <td className="td"><StatusBadge status={r.status} /></td>
                        <td className="td whitespace-nowrap">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card border-red-200 lg:col-span-3" aria-labelledby="danger">
          <h2 id="danger" className="mb-3 text-xl text-red-700">Zone sensible</h2>
          {profile.role === 'admin' ? (
            <p className="text-sm text-slate-600">Le compte administrateur ne peut pas être supprimé.</p>
          ) : (
            <DeleteUserForm userId={profile.id} name={userLabel(profile)} />
          )}
        </section>
      </div>
    </>
  );
}
