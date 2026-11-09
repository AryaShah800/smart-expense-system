/**
 * Shared API types. They mirror the Mongoose models in backend/models, as they look
 * after JSON serialisation (ObjectIds and Dates become strings).
 */

export type Id = string;
export type TransactionType = "income" | "expense";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurringStatus = "active" | "paused" | "completed";
export type SplitType = "equal" | "exact" | "percentage";

export interface Notification {
  _id?: Id;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  _id: Id;
  username: string;
  email: string;
  currency?: string;
  theme?: string;
  isVerified?: boolean;
  invitations?: Id[];
  notifications?: Notification[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: Id;
  name: string;
  type: TransactionType;
  user?: Id | null;
  icon?: string;
  color?: string;
  createdAt?: string;
}

/** A reference that the API may or may not have populated. */
export type Populated<T> = T | Id;

export interface Transaction {
  _id: Id;
  userId: Id;
  categoryId: Populated<Category> | null;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  recurringId?: Id;
  isRecurring?: boolean;
}

export interface Budget {
  _id: Id;
  userId: Id;
  categoryId: Populated<Category>;
  amount: number;
}

/** GET /budgets/status row: a budget with this month's spending. */
export interface BudgetStatus {
  _id?: Id;
  budgetId?: Id;
  categoryId: Id;
  categoryName?: string;
  category?: Category | string;
  amount?: number;
  limit?: number;
  spent: number;
  remaining?: number;
  percentage?: number;
  percentUsed?: number;
  status?: string;
}

export interface RecurringTransaction {
  _id: Id;
  userId: Id;
  categoryId: Populated<Category> | null;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: Frequency;
  startDate: string;
  nextDueDate: string;
  lastProcessedDate?: string;
  status: RecurringStatus;
  autoProcess?: boolean;
}

export interface GroupMember {
  _id: Id;
  username: string;
  email?: string;
}

export interface Group {
  _id: Id;
  name: string;
  type: string;
  adminId: Populated<GroupMember>;
  members: Populated<GroupMember>[];
  joinCode: string;
  createdAt?: string;
}

export interface GroupCategory {
  _id: Id;
  name: string;
  icon?: string;
  groupId?: Id | null;
  createdBy?: Id | null;
  isDefault?: boolean;
}

export interface ExpenseSplit {
  userId: Populated<GroupMember>;
  shareAmount: number;
}

export interface GroupExpense {
  _id: Id;
  groupId: Id;
  description: string;
  amount: number;
  category?: Populated<GroupCategory> | null;
  paidBy: Populated<GroupMember>;
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface Settlement {
  _id: Id;
  groupId: Id;
  fromUser: Populated<GroupMember>;
  toUser: Populated<GroupMember>;
  amount: number;
  createdAt?: string;
}

/** Shape of the error body returned by the API. */
export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string> | string[];
}

/** A transaction as returned by list endpoints, with the category populated. */
export type TransactionWithCategory = Omit<Transaction, "categoryId"> & {
  categoryId: Category | null;
};

/** Budget row from GET /budgets/status. */
export interface BudgetProgress {
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  exceeded: boolean;
}

/** One card from GET /dashboard/insights. */
export interface Insight {
  id: string;
  type?: string;
  icon?: string;
  category?: string;
  badge?: string;
  title: string;
  message: string;
  metric?: string;
  actionLink?: string;
  actionText?: string;
  actionFilter?: string;
}

/** A budget as returned by GET /budgets, with the category populated. */
export type BudgetWithCategory = Omit<Budget, "categoryId"> & { categoryId: Category };

/** GET /recurring: items (category populated) plus monthly totals. */
export type RecurringWithCategory = Omit<RecurringTransaction, "categoryId"> & {
  categoryId: Category | null;
};

export interface RecurringSummary {
  activeCount: number;
  monthlyRecurringExpense: number;
  monthlyRecurringIncome: number;
  netRecurring: number;
}

/** GET /groups/:id: admin and members are populated. */
export type GroupDetail = Omit<Group, "adminId" | "members"> & {
  adminId: GroupMember;
  members: GroupMember[];
};

/** GET /groups/:id/expenses: payer and split users are populated. */
export type GroupExpenseDetail = Omit<GroupExpense, "paidBy" | "splits"> & {
  paidBy: GroupMember;
  splits: { userId: GroupMember | Id; shareAmount: number }[];
};

export interface MemberBalance {
  userId: Id;
  username: string;
  balance: number;
}

export interface SuggestedSettlement {
  from: string;
  to: string;
  amount: number;
}

/** GET /groups/:id/splits */
export interface GroupSplits {
  balances: MemberBalance[];
  settlements: SuggestedSettlement[];
}
