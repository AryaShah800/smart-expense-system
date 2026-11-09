import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { queryKeys } from "../api/queryClient";
import type {
  BudgetProgress,
  BudgetWithCategory,
  Category,
  Group,
  GroupCategory,
  GroupDetail,
  GroupExpenseDetail,
  GroupSplits,
  Insight,
  Notification,
  RecurringSummary,
  RecurringWithCategory,
  TransactionWithCategory,
} from "../types";

/* ===================== READS ===================== */

export const useTransactions = () =>
  useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async () => (await api.get<TransactionWithCategory[]>("/transactions")).data,
  });

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

export const useBudgets = () =>
  useQuery({
    queryKey: queryKeys.budgets,
    queryFn: async () => (await api.get<BudgetWithCategory[]>("/budgets")).data,
  });

/** Status is optional on the Budgets page, so a failure there degrades to an empty list. */
export const useBudgetStatus = ({ tolerateErrors = false } = {}) =>
  useQuery({
    queryKey: [...queryKeys.budgetStatus, tolerateErrors],
    queryFn: async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        return (await api.get<BudgetProgress[]>("/budgets/status", { params: { timezone } })).data ?? [];
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
      const { data } = await api.get<{ recurring?: RecurringWithCategory[]; summary?: RecurringSummary }>("/recurring");
      return {
        recurring: data.recurring ?? [],
        summary: data.summary ?? {
          activeCount: 0,
          monthlyRecurringExpense: 0,
          monthlyRecurringIncome: 0,
          netRecurring: 0,
        },
      };
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
        api.get<GroupDetail>(`/groups/${id}`),
        api.get<GroupExpenseDetail[]>(`/groups/${id}/expenses`),
        api.get<GroupSplits>(`/groups/${id}/splits`),
      ]);
      return { group: group.data, expenses: expenses.data, splits: splits.data };
    },
    enabled: Boolean(id),
  });

export const useGroupCategories = (groupId: string) =>
  useQuery({
    queryKey: queryKeys.groupCategories(groupId),
    queryFn: async () => (await api.get<GroupCategory[]>(`/groups/${groupId}/categories`)).data,
  });

export const useNotifications = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => (await api.get<Notification[]>("/users/notifications")).data,
    enabled,
  });

export const useInvitations = () =>
  useQuery({
    queryKey: queryKeys.invitations,
    queryFn: async () => (await api.get<Group[]>("/users/invitations")).data,
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

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: invalidate,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put("/users/notifications/read"),
    onSuccess: () =>
      qc.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((n) => ({ ...n, isRead: true }))
      ),
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

export function useAddGroupCategory(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; icon: string }) => api.post(`/groups/${groupId}/categories`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groupCategories(groupId) }),
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { categoryId: string; amount: number }) => api.post("/budgets", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets }),
  });
}
