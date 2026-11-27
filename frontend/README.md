# FOM — frontend (site utilisateur)

> Projet universitaire — **données fictives uniquement**. Aucune décision de financement réelle n'est prise.

Application Next.js 15 (App Router, TypeScript, Tailwind) en 5 langues (français, anglais, espagnol, allemand, portugais). Elle se branche sur le **backend Supabase** (`backend.zip`, voir `docs/CONTRACT.md`). L'administration est une application séparée (`admin.zip`).

## Parcours utilisateur
1. **Connexion** (`/login`) : numéro de téléphone + clé d'identification à 3 chiffres → « Ouvrir une session ». Si le numéro est nouveau et la clé valide, le compte est créé automatiquement.
2. **Mon espace** (`/espace`) : date du jour, « Bienvenue dans votre espace », solde disponible (fictif, défini par l'admin), « Effectuer une demande », « Historique » (sans action).
3. **Demande** (`/apply`) : étape 1 (nom complet, adresse e-mail, banque et vérification complémentaire), étape 2 (carte et vérification), anneau de traitement, puis écran **Échec** avec le nombre de tentatives restantes (cliquable pour recommencer). 3 demandes au maximum par compte (`MAX_ATTEMPTS` dans `src/lib/config.ts`).

## Variables d'environnement
| Variable | Valeur | Remarque |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé **anon / publishable** | publique par conception |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` ou l'URL Vercel | |
| `SUPABASE_SERVICE_ROLE_KEY` | clé **service_role** | **secrète**, sans préfixe `NEXT_PUBLIC_`. Utilisée uniquement dans `src/lib/supabase/admin.ts` (vérification des clés, création des comptes). À ne mettre que dans Vercel (frontend) |
| `ACCOUNT_PASSWORD_SECRET` | texte aléatoire ≥ 24 caractères | fabrique le mot de passe interne de chaque compte. **Ne plus jamais le changer** une fois des comptes créés |
| `ACCOUNT_EMAIL_DOMAIN` | `gmail.com` (défaut) | domaine de l'adresse interne `<numéro>@<domaine>`. Aucun e-mail n'est envoyé. Si Supabase refuse l'adresse, changez de domaine |

## En local
```bash
npm install
cp .env.example .env.local     # renseigner les variables
npm run dev                    # http://localhost:3000
npm run typecheck && npm test
```

## Mise en ligne
1. **Supabase d'abord** (voir `backend/LISEZ-MOI.md`) : SQL, inscription publique désactivée, compte admin.
2. **GitHub** : `git init && git add . && git commit -m "FOM frontend" && git push` (vérifiez que `.env.local` n'est pas listé par `git status`).
3. **Vercel** : *Add New → Project* → importer le dépôt → renseigner les 6 variables ci-dessus (Production) → *Deploy*. Vérifiez ensuite que `NEXT_PUBLIC_SITE_URL` est l'adresse finale (redéployez sinon).

## Sécurité
- CSP avec nonce générée par `src/middleware.ts`, HSTS, `X-Frame-Options`, `nosniff`.
- Cookies de session httpOnly (`@supabase/ssr`) ; `getUser()` à chaque page et action.
- La clé `service_role` n'existe que côté serveur, dans un seul fichier (un test statique le vérifie).
- Vérification de la clé d'identification côté serveur ; limiteur en mémoire : 15 échecs / 10 min / IP (par instance serverless : protection de base).
- Validation Zod côté client et serveur, puis validation en base ; erreurs du backend traduites ; redirections `?next=` filtrées.

## Tests
| Commande | Contenu |
|---|---|
| `npm test` | animation du traitement, parité des 5 langues, codes d'erreur, CSP, validations, tests statiques |
| `npm run e2e` | Playwright : redirections des pages privées, page de connexion (serveur lancé requis) |

## Limites
- Vérifié avec un faux serveur Supabase (parcours complet) ; **pas encore testé sur un vrai projet Supabase**.
- Si Supabase refuse les adresses internes (`email address invalid`), changez `ACCOUNT_EMAIL_DOMAIN`.
- Les clés d'identification sont partagées : toute personne ayant un numéro et une clé valide peut entrer.
