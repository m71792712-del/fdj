#!/bin/sh
# Regénère :
#  - supabase/setup_complete.sql = toutes les migrations (dans l'ordre) + seed.sql  (base NEUVE : un seul copier-coller dans le SQL Editor)
#  - supabase/modif_espace.sql   = en-tête + migration « espace »                    (base DÉJÀ installée avec la version précédente)
set -eu
cd "$(dirname "$0")/../supabase"
out=setup_complete.sql
{
  echo "-- Fichier généré par scripts/build_setup.sh : migrations + seed. Ne pas modifier à la main."
  for f in migrations/*.sql; do
    echo ""
    echo "-- ============ $f ============"
    cat "$f"
  done
  echo ""
  echo "-- ============ seed.sql ============"
  cat seed.sql
} > "$out"
echo "OK -> supabase/$out"

espace=migrations/20261126000100_espace.sql
{
  cat <<'HEADER'
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

HEADER
  cat "$espace"
} > modif_espace.sql
echo "OK -> supabase/modif_espace.sql"
