 API Documentation

## API Version

The API uses versioned routes:


/api/v1
Authentication
Authenticated requests require a valid Supabase Auth session/token.
The backend must verify the authenticated user before accessing protected resources.
Authentication Endpoints
GET /api/v1/auth/me
Returns the currently authenticated user and profile.
POST /api/v1/auth/logout
Logs out the current user.
Authentication credentials are managed through Supabase Auth.
Profile
GET /api/v1/profile
Returns the authenticated user's profile.
PATCH /api/v1/profile
Updates the authenticated user's profile.
Profile fields:
name
company_name
Customers
GET /api/v1/customers
Returns customers belonging to the authenticated user.
Excludes archived customers by default.
Supports search and basic pagination.
Potential query parameters:
?search=john
?page=1
?limit=25
GET /api/v1/customers/:id
Returns a single customer.
The customer must belong to the authenticated user.
POST /api/v1/customers
Creates a customer.
Example request:
{
  "name": "John Smith",
  "phone": "555-555-5555",
  "email": "john@example.com",
  "street": "123 Main St",
  "city": "Detroit",
  "state": "MI",
  "zip": "48000",
  "poolSize": "20x40",
  "notes": "Gate code 1234"
}
PATCH /api/v1/customers/:id
Updates a customer.
PATCH /api/v1/customers/:id/archive
Archives a customer. Customers are archived rather than permanently deleted. Archiving sets `archived_at` and preserves the customer along with all associated orders and transactions.
Orders
GET /api/v1/orders
Returns orders belonging to the authenticated user.
Supports filtering by:
date
status
order type
customer
GET /api/v1/orders/:id
Returns a single order.
POST /api/v1/orders
Creates an order.
Example:
{
  "customerId": "uuid",
  "orderType": "opening",
  "scheduledDate": "2026-09-15T09:00:00-04:00",
  "price": 250,
  "notes": "Customer requested early morning"
}
New orders default to status "scheduled". Clients do not need to provide a status when creating an order.
PATCH /api/v1/orders/:id
Updates an order's orderType, scheduledDate, price, and/or notes. Does not change status — use the dedicated endpoints below. Cancelled orders cannot be edited through this endpoint.
PATCH /api/v1/orders/:id/complete
Marks the order completed and sets completedDate. Cancelled orders cannot be completed. Idempotent if the order is already completed.
PATCH /api/v1/orders/:id/cancel
Marks the order cancelled. Completed orders cannot be cancelled. Idempotent if the order is already cancelled.
Orders are not permanently deleted through the application.
Transactions
GET /api/v1/transactions
Returns transactions belonging to the authenticated user.
Supports filtering by order and date.
GET /api/v1/transactions/:id
Returns a single transaction.
POST /api/v1/transactions
Creates a transaction.
Example:
{
  "orderId": "uuid",
  "amount": 250,
  "transactionDate": "2026-09-15T12:00:00-04:00",
  "paymentMethod": "cash",
  "notes": ""
}
PATCH /api/v1/transactions/:id
Updates a transaction.
Transactions represent financial records and are not permanently deleted through the application.
Dashboard
GET /api/v1/dashboard
Returns summary information for the authenticated user.
Response data:
today's jobs
upcoming jobs
scheduled revenue
unpaid amount
current month revenue

Dashboard calculations:

- Scheduled revenue: sum of `price` for orders where `status = 'scheduled'`.
- Unpaid amount: for each non-cancelled order, `max(price - sum(transactions.amount), 0)`, summed across those orders. Cancelled orders do not contribute to unpaid amounts.
- Current month revenue: sum of `transactions.amount` where `transaction_date` falls within the current calendar month.

Dashboard calculations should be performed on the server/database rather than trusted from the client.
API Design Rules
Authentication
Every protected endpoint must verify the authenticated user.
Authorization
Users must only access resources belonging to their account.
Validation
Request bodies must be validated before processing.
Errors
The API should return consistent error responses.
Example:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Customer name is required"
  }
}
IDs
Database UUIDs are used as resource identifiers.
Dates
API dates should use ISO 8601 format.
Money
Money should be represented as numeric values corresponding to dollars.
The database uses numeric(10,2) for monetary fields.