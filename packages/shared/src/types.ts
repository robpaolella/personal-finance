// === Enums / Unions ===

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'retirement' | 'venmo' | 'cash';
export type AccountClassification = 'liquid' | 'investment' | 'liability';
export type CategoryType = 'income' | 'expense';

// === Database Row Interfaces ===

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

export interface AccountOwner {
  id: number;
  displayName: string;
}

export interface Account {
  id: number;
  name: string;
  last_four: string | null;
  type: AccountType;
  classification: AccountClassification;
  owner: string; // legacy — first owner display_name for backward compat
  owners: AccountOwner[];
  isShared: boolean;
  is_active: number;
  created_at: string;
}

export interface Category {
  id: number;
  group_name: string;
  sub_name: string;
  display_name: string;
  type: CategoryType;
  is_deductible: number;
  sort_order: number;
}

export interface Transaction {
  id: number;
  account_id: number;
  date: string;
  description: string;
  note: string | null;
  category_id: number;
  amount: number;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  month: string;
  amount: number;
}

export interface BalanceSnapshot {
  id: number;
  account_id: number;
  date: string;
  balance: number;
  note: string | null;
}

export interface Asset {
  id: number;
  name: string;
  purchase_date: string;
  cost: number;
  lifespan_years: number;
  salvage_value: number;
  created_at: string;
}

// === API Response Types ===

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// === Auth Types ===

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthPayload {
  userId: number;
  username: string;
  displayName: string;
}
