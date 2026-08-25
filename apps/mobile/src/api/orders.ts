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
}

export function listOrders(filters: OrderListFilters = {}): Promise<OrderListResponse> {
  const params = new URLSearchParams();
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.status) params.set("status", filters.status);
  if (filters.orderType) params.set("orderType", filters.orderType);
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
