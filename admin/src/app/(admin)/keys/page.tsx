import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteAccessKeyAction, toggleAccessKeyAction } from '@/lib/actions';
import { AddAccessKeyForm } from '@/components/Forms';
import { EmptyState, PageHeader } from '@/components/ui';
import type { AccessKeyRow } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Clés d’accès' };

export default async function KeysPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from('access_keys').select('id,code,is_active,created_at').order('code');
  const keys = (data ?? []) as AccessKeyRow[];
  const activeCount = keys.filter((k) => k.is_active).length;

  return (
    <>
      <PageHeader title="Clés d’accès" subtitle="Clés à 3 chiffres demandées avec le numéro de téléphone pour accéder à l’espace" />
      <section className="card mb-6" aria-labelledby="add">
        <h2 id="add" className="mb-3 text-xl">Ajouter une clé</h2>
        <AddAccessKeyForm />
        <p className="mt-3 text-xs text-slate-500">Une même clé peut être utilisée par plusieurs personnes. Une clé désactivée ou supprimée est refusée dès la connexion suivante.</p>
      </section>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Impossible de charger les clés.</p>}
      {keys.length === 0 ? (
        <EmptyState text="Aucune clé : personne ne peut accéder à l’espace tant qu’aucune clé active n’existe." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
            <table className="w-full">
              <thead className="border-b border-slate-100"><tr><th className="th">Clé</th><th className="th">État</th><th className="th">Ajoutée le</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="td font-mono text-base font-semibold tracking-widest">{k.code}</td>
                    <td className="td">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${k.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{k.is_active ? 'Active' : 'Désactivée'}</span>
                    </td>
                    <td className="td whitespace-nowrap">{formatDate(k.created_at, false)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <form action={toggleAccessKeyAction}>
                          <input type="hidden" name="keyId" value={k.id} />
                          <input type="hidden" name="active" value={k.is_active ? 'false' : 'true'} />
                          <button className="btn btn-outline btn-sm">{k.is_active ? 'Désactiver' : 'Réactiver'}</button>
                        </form>
                        <form action={deleteAccessKeyAction}>
                          <input type="hidden" name="keyId" value={k.id} />
                          <button className="btn btn-danger btn-sm">Supprimer</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">{activeCount} clé{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''} sur {keys.length}.</p>
        </>
      )}
    </>
  );
}
