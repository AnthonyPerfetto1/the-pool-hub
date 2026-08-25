export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  poolSize: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  poolSize?: string | null;
  notes?: string | null;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type OrderType = "opening" | "closing";
export type OrderStatus = "scheduled" | "completed" | "cancelled";

export interface OrderCustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface Order {
  id: string;
  customerId: string;
  customer: OrderCustomerSummary;
  orderType: OrderType;
  scheduledDate: string;
  completedDate: string | null;
  price: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  orderType: OrderType;
  scheduledDate: string;
  price: number | string;
  notes?: string | null;
}

export type UpdateOrderInput = Partial<
  Pick<CreateOrderInput, "orderType" | "scheduledDate" | "price" | "notes">
>;
