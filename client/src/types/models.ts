// Shapes of the JSON the Express API returns (see backend/models and backend/controllers).
// MongoDB ObjectIds and Dates arrive as strings.

export type Id = string;
export type IsoDate = string;
export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';
export type Theme = 'light' | 'dark';

/** Stored in localStorage under "user" after login or OTP verification. */
export interface AuthUser {
  _id: Id;
  username: string;
  email: string;
  token?: string;
  currency?: string;
  theme?: string;
}

export interface Notification {
  _id: Id;
  message: string;
  isRead: boolean;
  createdAt: IsoDate;
}

/** GET /users/me (password excluded). */
export interface User extends AuthUser {
  isVerified: boolean;
  invitations: Id[];
  notifications: Notification[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Category {
  _id: Id;
  name: string;
  type: TransactionType;
  user: Id | null;
  icon: string;
  color: string;
  createdAt: IsoDate;
}

export interface Transaction {
  _id: Id;
  userId: Id;
  /** Populated with the category on list endpoints. */
  categoryId: Category | Id;
  type: TransactionType;
  amount: number;
  date: IsoDate;
  description?: string;
  recurringId?: Id;
  isRecurring: boolean;
}

export interface Budget {
  _id: Id;
  userId: Id;
  categoryId: Category | Id;
  amount: number;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'completed';

export interface RecurringTransaction {
  _id: Id;
  userId: Id;
  categoryId: Category | Id;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: Frequency;
  startDate: IsoDate;
  nextDueDate: IsoDate;
  lastProcessedDate?: IsoDate;
  status: RecurringStatus;
  autoProcess: boolean;
}

export interface MemberSummary {
  _id: Id;
  username: string;
  email?: string;
}

export interface Group {
  _id: Id;
  name: string;
  type: string;
  adminId: MemberSummary | Id;
  members: Array<MemberSummary | Id>;
  joinCode: string;
  createdAt: IsoDate;
}

export interface GroupCategory {
  _id: Id;
  name: string;
  icon: string;
  groupId: Id | null;
  createdBy: Id | null;
  isDefault: boolean;
}

export type SplitType = 'equal' | 'exact' | 'percentage';

export interface GroupExpense {
  _id: Id;
  groupId: Id;
  description: string;
  amount: number;
  category?: GroupCategory | Id;
  paidBy: MemberSummary | Id;
  splitType: SplitType;
  splits: Array<{ userId: MemberSummary | Id; shareAmount: number }>;
  createdAt: IsoDate;
}

/** Error body the API sends with 4xx/5xx responses. */
export interface ApiErrorBody {
  message?: string;
}

/** Narrows a populated reference to the object form. */
export function isPopulated<T extends { _id: Id }>(value: T | Id | null | undefined): value is T {
  return typeof value === 'object' && value !== null;
}

/** One row of GET /budgets/status. */
export interface BudgetStatus {
  category: Category | Id;
  limit: number;
  spent: number;
  remaining: number;
  exceeded: boolean;
}

export type InsightType = 'danger' | 'warning' | 'info' | 'success' | 'expense';

/** One card from GET /dashboard/insights. */
export interface Insight {
  id: string;
  type: InsightType;
  icon: string;
  category?: string;
  badge?: string;
  title: string;
  message: string;
  metric?: string;
  actionText?: string;
  actionLink?: string;
  actionFilter?: string;
}

/** A pending group invitation from GET /users/invitations. */
export interface GroupInvite {
  _id: Id;
  name: string;
  type: string;
}

/** GET /groups/:id (members and admin populated). */
export interface GroupDetails extends Omit<Group, 'members' | 'adminId'> {
  members: MemberSummary[];
  adminId: MemberSummary | null;
}

/** GET /groups/:id/expenses (payer populated). */
export interface GroupExpenseWithPayer extends Omit<GroupExpense, 'paidBy'> {
  paidBy: MemberSummary | null;
}

/** GET /groups/:id/splits. */
export interface GroupSplits {
  balances: Array<{ userId: Id; username: string; balance: number }>;
  settlements: Array<{ from: string; to: string; amount: number }>;
}
