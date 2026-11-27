-- Fichier généré par scripts/build_setup.sh : en-tête + migrations/20261126000100_espace.sql. Ne pas modifier à la main.
-- =====================================================================
-- MISE À JOUR d'une base Supabase DÉJÀ INSTALLÉE avec la version précédente (setup_complete.sql ou modif_finale.sql).
-- Supabase > SQL Editor > coller tout ce fichier > Run, AVANT de déployer le nouveau frontend et le nouvel admin.
--   • crée les clés d'accès (5 clés de départ : 112, 322, 458, 697, 805) et le solde affiché (0 EUR) ;
--   • la demande contient désormais « Nom complet » et « Adresse email » à la place du motif ;
--   • remplace la fonction create_loan_request (nouvelle signature).
-- Sans danger : aucune demande ni aucun compte n'est supprimé, les anciennes demandes gardent leur motif.
-- Relançable : une clé supprimée par l'admin ne revient pas, le solde déjà saisi n'est pas écrasé.
-- NE PAS l'exécuter sur une base neuve : utilisez setup_complete.sql, qui contient déjà tout.
-- =====================================================================

-- =====================================================================
-- Migration 5/5 : espace utilisateur (clés d'accès, solde affiché, nom complet + e-mail de la demande).
-- Idempotente : peut être rejouée sans effet de bord ni perte de données.
--  1) access_keys : clés d'accès à 3 chiffres, gérées par l'admin, vérifiées côté serveur par le site.
--  2) Solde affiché (fictif, identique pour tous les comptes) : lecture get_displayed_balance(), écriture admin_set_balance().
--  3) loan_requests : « Nom complet » et « Adresse email » remplacent le motif (qui devient facultatif).
--  4) create_loan_request : nouvelle signature (p_full_name, p_contact_email à la place du motif).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Clés d'accès
-- ---------------------------------------------------------------------
create table if not exists public.access_keys (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[0-9]{3}$'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

revoke all on public.access_keys from public, anon, authenticated;
alter table public.access_keys enable row level security;

-- Gestion par l'admin uniquement (RLS). Les utilisateurs du site n'ont aucun accès direct :
-- le serveur du site lit cette table avec la clé service_role (qui contourne la RLS) pour vérifier une clé saisie.
grant select, insert, update, delete on public.access_keys to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.access_keys to service_role;
  end if;
end;
$$;

drop policy if exists access_keys_select_admin on public.access_keys;
drop policy if exists access_keys_insert_admin on public.access_keys;
drop policy if exists access_keys_update_admin on public.access_keys;
drop policy if exists access_keys_delete_admin on public.access_keys;
create policy access_keys_select_admin on public.access_keys for select to authenticated
  using ((select public.admin_access_ok()));
create policy access_keys_insert_admin on public.access_keys for insert to authenticated
  with check ((select public.admin_access_ok()));
create policy access_keys_update_admin on public.access_keys for update to authenticated
  using ((select public.admin_access_ok())) with check ((select public.admin_access_ok()));
create policy access_keys_delete_admin on public.access_keys for delete to authenticated
  using ((select public.admin_access_ok()));

-- Audit des écritures de l'admin sur les clés (requêtes API authentifiées uniquement).
create or replace function public.audit_access_keys()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'access_key.created', 'access_key', new.id, jsonb_build_object('code', new.code));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'access_key.updated', 'access_key', new.id,
            jsonb_build_object('code', new.code, 'was_active', old.is_active, 'is_active', new.is_active));
  else
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'access_key.deleted', 'access_key', old.id, jsonb_build_object('code', old.code));
  end if;
  return null;
end;
$$;

drop trigger if exists audit_access_keys_trg on public.access_keys;
create trigger audit_access_keys_trg after insert or update or delete on public.access_keys
  for each row execute function public.audit_access_keys();

-- Clés de départ : uniquement si la table est vide (une clé supprimée par l'admin ne revient jamais).
insert into public.access_keys (code)
select c from (values ('112'), ('322'), ('458'), ('697'), ('805')) as k(c)
where not exists (select 1 from public.access_keys);

-- ---------------------------------------------------------------------
-- 2) Solde affiché (fictif, identique pour tous les comptes)
-- ---------------------------------------------------------------------
insert into public.app_settings (key, value)
values ('displayed_balance', '{"amount": 0, "currency": "EUR"}'::jsonb)
on conflict (key) do nothing;

-- Lecture par tout utilisateur connecté. Valeur de repli : 0 EUR.
create or replace function public.get_displayed_balance()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
  v_amount numeric := 0;
  v_currency text := 'EUR';
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select value into v from public.app_settings where key = 'displayed_balance';
  if v is not null and jsonb_typeof(v) = 'object' then
    if jsonb_typeof(v -> 'amount') = 'number' then
      v_amount := (v ->> 'amount')::numeric;
    end if;
    if (v ->> 'currency') in ('EUR', 'USD', 'XPF') then
      v_currency := v ->> 'currency';
    end if;
  end if;
  return jsonb_build_object('amount', v_amount, 'currency', v_currency);
end;
$$;

-- Écriture réservée à l'admin : montant de 0 à 1 000 000 000 000 (2 décimales au plus), devise EUR / USD / XPF.
create or replace function public.admin_set_balance(p_amount numeric, p_currency text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_access_ok() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000000000000 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  if p_currency is null or p_currency not in ('EUR', 'USD', 'XPF') then
    raise exception 'invalid_currency' using errcode = 'P0001';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values ('displayed_balance', jsonb_build_object('amount', p_amount, 'currency', p_currency), now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();

  insert into public.audit_logs (actor_id, action, entity_type, details)
  values (auth.uid(), 'balance.updated', 'setting', jsonb_build_object('amount', p_amount, 'currency', p_currency));
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Demandes : nom complet + e-mail de contact (le motif devient facultatif)
-- ---------------------------------------------------------------------
alter table public.loan_requests add column if not exists full_name text;
alter table public.loan_requests add column if not exists contact_email text;
alter table public.loan_requests alter column purpose_code drop not null;
alter table public.loan_requests drop constraint if exists loan_requests_purpose_details_chk;

alter table public.loan_requests drop constraint if exists loan_requests_full_name_chk;
alter table public.loan_requests add constraint loan_requests_full_name_chk
  check (full_name is null or char_length(btrim(full_name)) between 2 and 120);
alter table public.loan_requests drop constraint if exists loan_requests_contact_email_chk;
alter table public.loan_requests add constraint loan_requests_contact_email_chk
  check (contact_email is null or (char_length(contact_email) between 5 and 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));

-- ---------------------------------------------------------------------
-- 4) create_loan_request : nouvelle signature
--    p_full_name et p_contact_email remplacent le motif ; p_amount et p_currency disparaissent (montant et devise ne sont plus demandés).
--    Les types de paramètres sont inchangés : l'ancienne fonction est supprimée avant la recréation
--    (PostgreSQL refuse de renommer des paramètres avec CREATE OR REPLACE).
-- ---------------------------------------------------------------------
-- Le formulaire n'a plus de montant ni de devise : ces deux colonnes deviennent facultatives (les anciennes demandes les gardent).
alter table public.loan_requests alter column amount drop not null;
alter table public.loan_requests alter column currency drop not null;
alter table public.loan_requests alter column currency drop default;

drop function if exists public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text);
drop function if exists public.create_loan_request(text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text);

create or replace function public.create_loan_request(
  p_full_name text,
  p_contact_email text,
  p_description text,
  p_bank_id uuid,
  p_custom_bank_name text,
  p_card_type_id uuid default null,
  p_verif_color text default null,
  p_verif_digit integer default null,
  p_verif_year integer default null,
  p_verif_fruit text default null,
  p_verif_animal text default null,
  p_custom_card_name text default null,
  p_verif_month integer default null,
  p_verif_number text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_email text;
  v_description text;
  v_loan uuid;
  v_vcolor text := null;
  v_vfruit text := null;
  v_vnumber text := null;
  v_vanimal text := null;
  v_custom_card text := null;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Nom complet (2 à 120 caractères, espaces multiples réduits) et adresse e-mail (enregistrée en minuscules).
  v_name := regexp_replace(public.clean_text(p_full_name, 2, 120, 'invalid_full_name'), '\s+', ' ', 'g');
  v_email := lower(btrim(coalesce(p_contact_email, '')));
  if char_length(v_email) < 5 or char_length(v_email) > 254
     or public.has_control_chars(v_email)
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_contact_email' using errcode = 'P0001';
  end if;

  -- Description : facultative (le formulaire n'a plus ce champ). Absente ou vide -> chaîne vide ; sinon 2000 caractères au plus.
  if p_description is null or btrim(p_description) = '' then
    v_description := '';
  else
    v_description := public.clean_text(p_description, 1, 2000, 'invalid_description');
  end if;

  -- Banque : obligatoirement l'une des banques enregistrées (et actives) par l'administrateur.
  -- Plus d'option « Autre banque » : aucun nom saisi librement n'est accepté.
  if p_bank_id is null or nullif(btrim(coalesce(p_custom_bank_name, '')), '') is not null then
    raise exception 'invalid_bank' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.banks where id = p_bank_id and is_active) then
    raise exception 'invalid_bank' using errcode = 'P0001';
  end if;

  -- Type de carte : une carte de la liste OU une carte « Autre » (le formulaire impose ce choix ; la base reste tolérante).
  if p_card_type_id is not null and p_custom_card_name is not null then
    raise exception 'invalid_card_type' using errcode = 'P0001';
  end if;
  if p_card_type_id is not null
     and not exists (select 1 from public.card_types where id = p_card_type_id and is_active) then
    raise exception 'invalid_card_type' using errcode = 'P0001';
  end if;
  if p_custom_card_name is not null then
    v_custom_card := public.clean_text(p_custom_card_name, 2, 60, 'invalid_card_type');
  end if;

  -- Vérification pédagogique : valeurs fictives saisies pour CETTE demande.
  -- « Couleur préférée » : 1 à 16 chiffres ; les espaces de mise en forme sont acceptés puis retirés avant l'enregistrement.
  if p_verif_color is not null then
    v_vcolor := regexp_replace(public.clean_text(p_verif_color, 1, 30, 'invalid_verification'), '\s', '', 'g');
    if v_vcolor !~ '^[0-9]{1,16}$' then
      raise exception 'invalid_verification' using errcode = 'P0001';
    end if;
  end if;
  if p_verif_digit is not null and (p_verif_digit < 0 or p_verif_digit > 999999999) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  if p_verif_year is not null and (p_verif_year < 1900 or p_verif_year > 2100) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  if p_verif_month is not null and (p_verif_month < 1 or p_verif_month > 12) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  -- « Numéro » : de 1 à 27 lettres/chiffres, enregistrés en majuscules et sans espaces.
  if p_verif_number is not null then
    v_vnumber := upper(regexp_replace(p_verif_number, '\s', '', 'g'));
    if v_vnumber !~ '^[A-Z0-9]{1,27}$' then
      raise exception 'invalid_verification' using errcode = 'P0001';
    end if;
  end if;
  if p_verif_fruit is not null then
    v_vfruit := public.clean_text(p_verif_fruit, 1, 30, 'invalid_verification');
  end if;
  if p_verif_animal is not null then
    v_vanimal := public.clean_text(p_verif_animal, 1, 30, 'invalid_verification');
  end if;

  -- Limitation de débit (après validation : une requête invalide ne consomme pas le quota)
  if not public.check_rate_limit('loan:' || v_uid::text, public.setting_numeric('loans_per_hour', 5)::integer, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.loan_requests
    (user_id, full_name, contact_email, description,
     bank_id, card_type_id, status,
     verif_color, verif_digit, verif_year, verif_month, verif_fruit, verif_animal, custom_card_name, verif_number)
  values
    (v_uid, v_name, v_email, v_description,
     p_bank_id, p_card_type_id, 'pending',   -- statut TOUJOURS « pending »
     v_vcolor, p_verif_digit, p_verif_year, p_verif_month, v_vfruit, v_vanimal, v_custom_card, v_vnumber)
  returning id into v_loan;

  return v_loan;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Privilèges d'exécution (jamais anon)
-- ---------------------------------------------------------------------
revoke all on function public.create_loan_request(text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.get_displayed_balance() from public, anon, authenticated;
revoke all on function public.admin_set_balance(numeric, text) from public, anon, authenticated;
revoke all on function public.audit_access_keys() from public, anon, authenticated;

grant execute on function public.create_loan_request(text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text) to authenticated;
grant execute on function public.get_displayed_balance() to authenticated;
grant execute on function public.admin_set_balance(numeric, text) to authenticated;
