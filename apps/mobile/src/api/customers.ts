import type { Customer, CreateCustomerInput, UpdateCustomerInput } from "@the-pool-hub/types";
import { apiClient } from "../lib/api-client";

interface CustomerListResponse {
  customers: Customer[];
  page: number;
  limit: number;
}

interface CustomerResponse {
  customer: Customer;
}

export function listCustomers(search?: string): Promise<CustomerListResponse> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiClient.get<CustomerListResponse>(`/customers${query}`);
}

export function getCustomer(id: string): Promise<CustomerResponse> {
  return apiClient.get<CustomerResponse>(`/customers/${id}`);
}

export function createCustomer(input: CreateCustomerInput): Promise<CustomerResponse> {
  return apiClient.post<CustomerResponse>("/customers", input);
}

export function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerResponse> {
  return apiClient.patch<CustomerResponse>(`/customers/${id}`, input);
}

export function archiveCustomer(id: string): Promise<CustomerResponse> {
  return apiClient.patch<CustomerResponse>(`/customers/${id}/archive`, {});
}
