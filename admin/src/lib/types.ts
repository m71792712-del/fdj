export const LOAN_STATUSES = ['pending', 'under_review', 'approved', 'rejected'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  under_review: 'En cours d’examen',
  approved: 'Approuvée',
  rejected: 'Refusée',
};

export interface LoanListRow {
  id: string;
  /** Nom complet et e-mail saisis dans la demande (nuls sur les anciennes demandes, qui ont un motif). */
  full_name: string | null;
  contact_email: string | null;
  purpose_code: string | null;
  custom_bank_name: string | null;
  status: LoanStatus;
  created_at: string;
  profiles: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  banks: { name: string } | null;
  loan_purposes: { label_fr: string } | null;
}

export interface LoanDetail extends LoanListRow {
  user_id: string;
  /** Nuls sur les nouvelles demandes (le formulaire ne demande plus ni montant ni devise). */
  amount: number | null;
  currency: string | null;
  purpose_details: string | null;
  description: string;
  verif_color: string | null;
  verif_digit: number | null;
  verif_year: number | null;
  verif_month: number | null;
  verif_number: string | null;
  verif_fruit: string | null;
  verif_animal: string | null;
  updated_at: string;
  profiles: ProfileInfo | null;
  banks: { name: string } | null;
  card_types: { name: string; family: string } | null;
  custom_card_name: string | null;
}

export interface HistoryRow {
  id: string;
  new_status: string; // seul le badge du statut est affiché dans l'historique
}

export interface BankRow {
  id: string;
  slug: string;
  name: string;
  type: 'bank' | 'fintech';
  is_active: boolean;
}

export interface SuggestionRow {
  id: string;
  name: string;
  submit_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  created_at: string;
  reviewed_at: string | null;
}

/** Profil d'un utilisateur. Pour un compte du site, `email` est synthétique : on affiche `phone`. */
export interface ProfileInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  demo_color: string | null;
  demo_city: string | null;
  demo_digit: number | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface AccessKeyRow {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface DisplayedBalance {
  amount: number;
  currency: string;
}

export const BALANCE_CURRENCIES = ['EUR', 'USD', 'XPF'] as const;

export interface AuditRow {
  id: number | string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Stats {
  users: number;
  loans: number;
  loans_last_7_days: number;
  banks_active: number;
  pending_suggestions: number;
  by_status: Record<string, number>;
}

export type ActionState = { ok?: string; error?: string } | null;
