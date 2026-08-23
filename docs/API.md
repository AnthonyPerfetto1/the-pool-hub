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
Customers
GET /api/v1/customers
Returns customers belonging to the authenticated user.
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
DELETE /api/v1/customers/:id
Deletes a customer.
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
PATCH /api/v1/orders/:id
Updates an order.
DELETE /api/v1/orders/:id
Deletes an order.
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
DELETE /api/v1/transactions/:id
Deletes a transaction.
Dashboard
GET /api/v1/dashboard
Returns summary information for the authenticated user.
Potential response data:
today's jobs
upcoming jobs
scheduled revenue
unpaid order totals
current month revenue
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