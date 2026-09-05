import type {
  CreateOrderInput,
  Order,
  OrderStatus,
  OrderType,
  UpdateOrderInput,
} from "@the-pool-hub/types";
import { apiClient } from "../lib/api-client";

interface OrderListResponse {
  orders: Order[];
  page: number;
  limit: number;
}

interface OrderResponse {
  order: Order;
}

export interface OrderListFilters {
  customerId?: string;
  status?: OrderStatus;
  orderType?: OrderType;
  // ISO instants — the backend already supports these (see server/src/routes/orders.ts),
  // just not previously exposed through this client.
  scheduledFrom?: string;
  scheduledTo?: string;
  limit?: number;
}

export function listOrders(filters: OrderListFilters = {}): Promise<OrderListResponse> {
  const params = new URLSearchParams();
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.status) params.set("status", filters.status);
  if (filters.orderType) params.set("orderType", filters.orderType);
  if (filters.scheduledFrom) params.set("scheduledFrom", filters.scheduledFrom);
  if (filters.scheduledTo) params.set("scheduledTo", filters.scheduledTo);
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return apiClient.get<OrderListResponse>(`/orders${query ? `?${query}` : ""}`);
}

export function getOrder(id: string): Promise<OrderResponse> {
  return apiClient.get<OrderResponse>(`/orders/${id}`);
}

export function createOrder(input: CreateOrderInput): Promise<OrderResponse> {
  return apiClient.post<OrderResponse>("/orders", input);
}

export function updateOrder(id: string, input: UpdateOrderInput): Promise<OrderResponse> {
  return apiClient.patch<OrderResponse>(`/orders/${id}`, input);
}

export function completeOrder(id: string): Promise<OrderResponse> {
  return apiClient.patch<OrderResponse>(`/orders/${id}/complete`, {});
}

export function cancelOrder(id: string): Promise<OrderResponse> {
  return apiClient.patch<OrderResponse>(`/orders/${id}/cancel`, {});
}
