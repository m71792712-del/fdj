# Financement des projets en outre-mer — backend (SQL Supabase) : à lire en premier

Le backend n'est pas déployé : c'est le dossier de référence (SQL, tests, documentation). Seul le SQL entre dans Supabase.

## Ordre de mise en ligne
1. **Supabase d'abord** (SQL Editor, puis *Run*) :
   - **base neuve** : coller tout `supabase/setup_complete.sql` ;
   - **base déjà installée avec la version précédente** : coller tout `supabase/modif_espace.sql` (sans danger : aucune demande ni aucun compte supprimé ; relançable).
   ⚠ À faire AVANT de déployer le frontend et l'admin : la demande contient maintenant « Nom complet » et « Adresse email » à la place du motif.
2. **Supabase > Authentication > Sign In / Providers** : désactiver **« Allow new users to sign up »** (les comptes du site sont créés côté serveur, avec la clé `service_role`).
3. **Compte admin** (un seul) : *Authentication > Users > Add user* (e-mail + mot de passe ≥ 14 caractères, « Auto Confirm User »), puis `supabase/promote_admin.sql`.
4. **Frontend**, puis **Admin** : remplacer le dossier du dépôt, commit + push (Vercel redéploie). Variables d'environnement : voir `.env.example` de chaque dossier.

## Résumé de la version « espace »
- **Clés d'accès** : table `access_keys` (3 chiffres, 5 clés de départ : 112, 322, 458, 697, 805), gérée par l'admin (page « Clés d'accès »). Le site les vérifie côté serveur.
- **Solde affiché** (fictif, identique pour tous les comptes) : modifié par l'admin (page Réglages), lu par `get_displayed_balance()`.
- **Demande** : « Nom complet » et « Adresse email » remplacent le motif (qui devient facultatif ; les anciennes demandes le gardent). Nouvelle signature de `create_loan_request` : plus de montant ni de devise (colonnes facultatives).
- Plus d'inscription publique : `enable_signup = false`.

## Vérifié
Tests statiques (24) ; suite SQL de sécurité (sections A à P) exécutée sur PostgreSQL 16 : installation neuve ET base mise à jour avec `modif_espace.sql` (relancé deux fois, données conservées).
Non testé : Supabase / Vercel réels, tests d'intégration via l'API (`npm test` avec un projet de test).
