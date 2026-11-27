# Financement des projets en outre-mer — backend.zip

> **Projet universitaire — utilisez uniquement des données fictives. Aucune décision de financement réelle n'est prise.**

Backend **Supabase** (PostgreSQL + Auth + RLS + fonctions RPC) partagé par le **frontend** (`https://erere.vercel.app`) et l'**admin** (`https://erereadmin.vercel.app`) — remplacez « erere » par le vrai nom de vos projets Vercel. Ce paquet ne contient **aucune interface**.

## Ce qui est testé, ce qui ne l'est pas (lisez ceci d'abord)

| | État |
|---|---|
| Tests statiques (`npm run test:static` : RLS sur chaque table, `search_path` sur chaque fonction, rien pour `anon`, `service_role` limité à la lecture des clés d'accès, seed : 5 clés d'accès / 31 motifs (anciennes demandes) / 4 types de carte / 16 banques, `setup_complete.sql` et `modif_espace.sql` à jour) | **exécutés : 24/24 réussis** |
| `tests/sql/security_tests.sql` (sections A à P : isolation, anti-promotion, un seul admin, validations, limite de débit, admin, MFA, audit, suppression de compte, clés d'accès, solde, nouvelle demande) | **exécuté sur PostgreSQL 16** : « TOUS LES TESTS SQL SONT PASSÉS », sur une installation neuve **et** sur une base mise à jour avec `modif_espace.sql` (relancé deux fois, données conservées). Rôles et schéma `auth` simulés (pas un vrai Supabase) |
| `tests/integration/api.test.ts`, `loadtest/k6-read.js` | écrits, **jamais exécutés** (il faut un projet Supabase de test) |
| `config.toml` | à valider avec votre version de la CLI Supabase |
| Audit de sécurité / test d'intrusion | **non réalisé** |

Conséquence : **exécutez `setup_complete.sql` puis `tests/sql/security_tests.sql` sur un projet Supabase de TEST** (un vrai Supabase) avant de présenter. Si une erreur apparaît, envoyez-moi le message exact : je corrige.

## Contenu

```
backend/
├─ README.md  package.json  .env.example  .gitignore
├─ supabase/
│  ├─ config.toml                                 # Auth : inscription publique désactivée, redirections, MFA, limites
│  ├─ migrations/20261021000100_schema.sql        # tables, contraintes, index
│  ├─ migrations/20261021000200_helpers_triggers.sql
│  ├─ migrations/20261021000300_rpc.sql           # fonctions : demande, admin, réglages, suppression de compte
│  ├─ migrations/20261021000400_rls_privileges.sql
│  ├─ migrations/20261126000100_espace.sql        # clés d'accès, solde affiché, nom complet + e-mail de la demande
│  ├─ seed.sql                                    # réglages, 5 clés d'accès, 31 motifs, 4 types de carte, 16 banques (idempotent)
│  ├─ setup_complete.sql                          # migrations + seed en UN fichier (généré)
│  ├─ modif_espace.sql                            # MISE À JOUR d'une base déjà installée avec la version précédente (idempotent, sans perte)
│  ├─ modif_finale.sql                            # ancienne mise à jour (versions antérieures)
│  ├─ promote_admin.sql                           # promotion de l'unique admin (SQL Editor)
│  └─ historique/                                 # anciens scripts d'ajout — NE PAS RELANCER (voir LISEZ-MOI.md)
├─ tests/  static.test.ts · sql/security_tests.sql · integration/api.test.ts
├─ loadtest/k6-read.js
├─ scripts/build_setup.sh
└─ docs/  CONTRACT.md · SECURITY.md · OPERATIONS.md
```

## Mise en route (projet Supabase hébergé)

1. **Créer deux projets** sur supabase.com : `credit-iles-test` et `credit-iles-prod` (mot de passe de base dans un gestionnaire de mots de passe).
2. **Schéma + données** : *SQL Editor* → coller **tout** `supabase/setup_complete.sql` (base neuve) → *Run*.
   Base déjà installée avec la version précédente : coller `supabase/modif_espace.sql` à la place. À faire **avant** de déployer le frontend et l'admin.
3. **Réglages Auth** (le `config.toml` ne s'applique pas tout seul à un projet hébergé ; équivalents dans le Dashboard) :
   - *Authentication → Sign In / Providers* : désactiver **« Allow new users to sign up »** : il n'y a plus d'inscription publique. Les comptes du site sont créés côté serveur par le frontend, avec la clé `service_role`, quand quelqu'un saisit son numéro et une clé d'accès valide.
   - *Authentication → Sign In / Providers → Email* : longueur minimale du mot de passe **8**, exigence **lettres + chiffres** ; confirmation d'e-mail **désactivée** (aucun e-mail n'est envoyé).
   - *Authentication → URL Configuration* : *Site URL* = `https://erere.vercel.app` ; *Redirect URLs* : `https://erere.vercel.app/**`, `https://erereadmin.vercel.app/**`, `http://localhost:3000/**`, `http://localhost:3001/**`.
   - *Authentication → Multi-Factor* : TOTP activé (non imposé).
   - Alternative en ligne de commande : `supabase link --project-ref …` puis `supabase config push` (après avoir remplacé « erere »).
4. **Compte admin** (un seul) : *Authentication → Users → Add user* (e-mail + mot de passe ≥ 14 caractères, « Auto Confirm User ») → éditer l'e-mail dans `supabase/promote_admin.sql` → *SQL Editor* → *Run*. **Ne mettez jamais ce mot de passe dans le code.**
5. **Récupérer les clés** : *Project Settings → API* :
   - `Project URL` et clé `anon`/publishable → frontend **et** admin (voir `docs/CONTRACT.md` §2) ;
   - clé `service_role` → **uniquement** dans les variables d'environnement du **frontend** sur Vercel (`SUPABASE_SERVICE_ROLE_KEY`, sans préfixe `NEXT_PUBLIC_`), jamais dans l'admin, jamais dans Git.
6. **Clés d'accès et solde** : après connexion à l'admin, page « Clés d'accès » (les 5 clés de départ sont 112, 322, 458, 697, 805) et page Réglages (solde affiché).
7. **Tester** (sur le projet de **test**) :
   - SQL : coller `tests/sql/security_tests.sql` → *Run* → attendre `TOUS LES TESTS SQL SONT PASSÉS` (tout est annulé à la fin).
   - API : `npm install` puis `SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… SUPABASE_TEST_SERVICE_ROLE_KEY=… npm test` (clé `service_role` du projet de **test** uniquement : elle sert à créer les comptes de test).
   - Sans base : `npm run test:static`.

## Mise en route locale (CLI Supabase, optionnel)

```bash
npm install -g supabase   # ou npx supabase
supabase start            # applique migrations + seed.sql automatiquement
supabase db reset         # repartir de zéro
```
Pour créer un compte de test en local : `supabase start` affiche la clé `service_role` locale ; le frontend crée les comptes avec elle.

## Règles métier réalisées dans la base

- **Un seul admin** (index unique) ; rôle changeable uniquement par SQL propriétaire.
- **Clés d'accès** : table `access_keys` (exactement 3 chiffres, sans doublon, activables/désactivables), lisible et modifiable **uniquement par l'admin** (RLS) ; le site les lit côté serveur avec `service_role`.
- **Solde affiché** (fictif, identique pour tous) : `get_displayed_balance()` (tout utilisateur connecté), `admin_set_balance()` (admin, 0 à 1 000 000 000 000, EUR/USD/XPF, audité).
- **Motif** : n'est plus demandé ; la colonne et la table des 31 motifs restent pour les anciennes demandes.
- **Banques** : seules les banques enregistrées (et actives) par l'admin sont acceptées ; l'option « Autre banque » n'existe plus (les anciennes suggestions restent modérables).
- **Suppression d'un utilisateur par l'admin** (`admin_delete_user`) : compte, profil et demandes supprimés, action journalisée ; le compte administrateur est protégé.
- **Demande** : validée par `create_loan_request` (**plus de montant ni de devise**, **nom complet** 2 à 120 car., **adresse e-mail** valide enregistrée en minuscules, description facultative (2000 car. max.), banque, type de carte, vérifications), statut forcé `pending`, historique créé, **5 demandes/heure/utilisateur**.
- **Admin** : statut avec commentaire obligatoire (historique + audit atomiques), statistiques, réglages validés, MFA **optionnel** (`require_admin_mfa`).
- **Audit en ajout seul**, **suppression de compte** (RGPD), aucun champ carte/CVV/IBAN.

## Limites à connaître

- La limitation de débit **de la connexion** est celle de Supabase Auth (par IP) ; la limitation **durable en base** protège les demandes. Les clés d'accès étant courtes (3 chiffres) et partagées, elles autorisent l'entrée mais n'identifient pas une personne : voir `docs/SECURITY.md` §3.
- Sans MFA, la sécurité de l'admin repose sur un mot de passe long et unique.
- La liste des 16 banques est modifiable par l'admin (ajout, désactivation).
- « Tenir plusieurs années » et « accueillir beaucoup d'utilisateurs » ne peuvent pas être **garantis** : voir `docs/OPERATIONS.md` (sauvegardes, supervision, mises à jour, test de charge, limites des plans).
