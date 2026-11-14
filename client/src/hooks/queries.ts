import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { queryKeys } from "../api/queryClient";
import type {
  Budget,
  BudgetStatus,
  Category,
  Group,
  GroupCategory,
  GroupDetails,
  GroupExpenseWithPayer,
  GroupInvite,
  GroupSplits,
  Insight,
  RecurringTransaction,
  Transaction,
} from "../types/models";

// Server state lives in TanStack Query; Redux keeps the session (auth) and the
// socket-fed notifications list.

export interface RecurringSummary {
  activeCount: number;
  monthlyRecurringExpense: number;
  monthlyRecurringIncome: number;
  netRecurring: number;
}

const EMPTY_RECURRING_SUMMARY: RecurringSummary = {
  activeCount: 0,
  monthlyRecurringExpense: 0,
  monthlyRecurringIncome: 0,
  netRecurring: 0,
};

/* ===================== READS ===================== */

export const useTransactions = () =>
  useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async () => (await api.get<Transaction[]>("/transactions")).data,
  });

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).data ?? [],
  });

export const useBudgets = () =>
  useQuery({
    queryKey: queryKeys.budgets,
    queryFn: async () => (await api.get<Budget[]>("/budgets")).data,
  });

/** Status is optional on the Budgets page, so a failure there can degrade to an empty list. */
export const useBudgetStatus = ({ tolerateErrors = false } = {}) =>
  useQuery({
    queryKey: [...queryKeys.budgetStatus, tolerateErrors],
    queryFn: async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        return (await api.get<BudgetStatus[]>("/budgets/status", { params: { timezone } })).data ?? [];
      } catch (err) {
        if (tolerateErrors) return [];
        throw err;
      }
    },
  });

export const useInsights = () =>
  useQuery({
    queryKey: queryKeys.insights,
    queryFn: async () => (await api.get<Insight[]>("/dashboard/insights")).data ?? [],
  });

export const useRecurring = () =>
  useQuery({
    queryKey: queryKeys.recurring,
    queryFn: async () => {
      const { data } = await api.get<{ recurring?: RecurringTransaction[]; summary?: RecurringSummary }>("/recurring");
      return { recurring: data.recurring ?? [], summary: data.summary ?? EMPTY_RECURRING_SUMMARY };
    },
  });

export const useGroups = () =>
  useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => (await api.get<Group[]>("/groups")).data,
  });

export const useGroupDetails = (id: string) =>
  useQuery({
    queryKey: queryKeys.group(id),
    queryFn: async () => {
      const [group, expenses, splits] = await Promise.all([
        api.get<GroupDetails>(`/groups/${id}`),
        api.get<GroupExpenseWithPayer[]>(`/groups/${id}/expenses`),
        api.get<GroupSplits>(`/groups/${id}/splits`),
      ]);
      return { group: group.data, expenses: expenses.data, splits: splits.data };
    },
    enabled: Boolean(id),
  });

export const useGroupCategories = (groupId: string) =>
  useQuery({
    queryKey: queryKeys.groupCategories(groupId),
    queryFn: async () => (await api.get<GroupCategory[]>(`/groups/${groupId}/categories`)).data ?? [],
    enabled: Boolean(groupId),
  });

export const useInvitations = () =>
  useQuery({
    queryKey: queryKeys.invitations,
    queryFn: async () => (await api.get<GroupInvite[]>("/users/invitations")).data ?? [],
  });

/* ===================== WRITES ===================== */

/** Run after any change that can alter totals, budgets, insights or recurring schedules. */
export function useInvalidateMoneyData() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.transactions }),
      qc.invalidateQueries({ queryKey: queryKeys.budgets }),
      qc.invalidateQueries({ queryKey: queryKeys.insights }),
      qc.invalidateQueries({ queryKey: queryKeys.recurring }),
    ]);
}

/** Run after any change to a group, its expenses or its settlements. */
export function useInvalidateGroups() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.groups }),
      qc.invalidateQueries({ queryKey: ["group"] }),
    ]);
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: invalidate,
  });
}

export function useRespondToInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, action }: { groupId: string; action: "accept" | "reject" }) =>
      api.post("/users/invitations/respond", { groupId, action }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.invitations }),
        qc.invalidateQueries({ queryKey: queryKeys.groups }),
      ]),
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { categoryId: string; amount: number }) => api.post("/budgets", body),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.budgets }),
      qc.invalidateQueries({ queryKey: queryKeys.insights }),
    ]),
  });
}
