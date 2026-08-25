import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from "@the-pool-hub/types";
import { apiClient } from "../lib/api-client";

interface TransactionListResponse {
  transactions: Transaction[];
  page: number;
  limit: number;
}

interface TransactionResponse {
  transaction: Transaction;
}

export function listTransactions(orderId: string): Promise<TransactionListResponse> {
  return apiClient.get<TransactionListResponse>(
    `/transactions?orderId=${encodeURIComponent(orderId)}`,
  );
}

export function getTransaction(id: string): Promise<TransactionResponse> {
  return apiClient.get<TransactionResponse>(`/transactions/${id}`);
}

export function createTransaction(input: CreateTransactionInput): Promise<TransactionResponse> {
  return apiClient.post<TransactionResponse>("/transactions", input);
}

export function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionResponse> {
  return apiClient.patch<TransactionResponse>(`/transactions/${id}`, input);
}
