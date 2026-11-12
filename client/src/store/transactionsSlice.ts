import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/axios";
import type { Transaction } from "../types/models";
import { loggedOut } from "./authSlice";
import { toLoadError, type LoadError, type LoadStatus } from "./loadError";

export interface TransactionsState {
  items: Transaction[];
  status: LoadStatus;
  error: LoadError | null;
}

export const fetchTransactions = createAsyncThunk<Transaction[], void, { rejectValue: LoadError }>(
  "transactions/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Transaction[]>("/transactions");
      return data;
    } catch (error) {
      return rejectWithValue(toLoadError(error, "Failed to load transactions."));
    }
  }
);

export const deleteTransaction = createAsyncThunk("transactions/delete", async (id: string) => {
  await api.delete(`/transactions/${id}`);
  return id;
});

const initialState: TransactionsState = { items: [], status: "idle", error: null };

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? { serverDown: false, message: "Failed to load transactions." };
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
      })
      .addCase(loggedOut, () => initialState);
  },
});

export default transactionsSlice.reducer;
