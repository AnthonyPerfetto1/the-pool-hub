# Database Documentation

## Database

PostgreSQL hosted by Supabase.

Supabase Auth is used for authentication.

The application database is relational and uses UUID primary keys.

## Tables

### profiles

Application-specific information associated with a Supabase Auth user.

Columns:

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | uuid | No | References auth.users(id) |
| name | text | No | User's name |
| company_name | text | Yes | Business/company name |
| created_at | timestamptz | No | Creation timestamp |
| updated_at | timestamptz | No | Last update timestamp |

`profiles.id` references `auth.users.id`.

Deleting the Auth user cascades to the profile.

---

### customers

Stores customers belonging to a business/user.

Columns:

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | uuid | No | Primary key |
| user_id | uuid | No | Owner of the customer |
| name | text | No | Customer name |
| phone | text | Yes | Customer phone number |
| email | text | Yes | Customer email |
| street | text | Yes | Street address |
| city | text | Yes | City |
| state | text | Yes | State |
| zip | text | Yes | ZIP code |
| pool_size | text | Yes | Pool dimensions/size |
| notes | text | Yes | Additional notes |
| archived_at | timestamptz | Yes | Timestamp the customer was archived, NULL if active |
| created_at | timestamptz | No | Creation timestamp |
| updated_at | timestamptz | No | Last update timestamp |

`user_id` references `profiles.id`.

Customers are archived rather than permanently deleted. Archiving a customer sets `archived_at` to the current timestamp; it does not delete the customer, its orders, or its transactions. Active customers have `archived_at = NULL`. The normal customer list excludes customers where `archived_at` is not NULL.

Deleting a profile cascades to its customers.

---

### orders

Represents work performed or scheduled for a customer.

Columns:

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | uuid | No | Primary key |
| customer_id | uuid | No | Customer associated with order |
| order_type | text | No | Opening or closing |
| scheduled_date | timestamptz | No | Scheduled date/time |
| completed_date | timestamptz | Yes | Actual completion date/time |
| price | numeric(10,2) | No | Total order price |
| status | text | No | Scheduled, completed, or cancelled. Defaults to `scheduled`. |
| notes | text | Yes | Order-specific notes |
| created_at | timestamptz | No | Creation timestamp |
| updated_at | timestamptz | No | Last update timestamp |

`customer_id` references `customers.id`.

New orders default to `status = 'scheduled'`. Clients do not need to provide a status when creating an order.

Orders are not permanently deleted through the application.

Allowed `order_type` values:

- opening
- closing

Allowed `status` values:

- scheduled
- completed
- cancelled

The application does not delete customers; it archives them via `customers.archived_at`. The `ON DELETE CASCADE` on `customer_id` remains at the database level as a schema-level safety net but is not exercised through normal application use.

---

### transactions

Represents money received for an order.

Columns:

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | uuid | No | Primary key |
| order_id | uuid | No | Associated order |
| amount | numeric(10,2) | No | Amount received |
| transaction_date | timestamptz | No | Date/time payment occurred |
| payment_method | text | No | Payment method |
| notes | text | Yes | Transaction notes |
| created_at | timestamptz | No | Creation timestamp |
| updated_at | timestamptz | No | Last update timestamp |

`order_id` references `orders.id`.

Transactions represent financial records and are not permanently deleted through the application.

Allowed `payment_method` values:

- cash
- check
- card
- other

The application does not delete orders. The `ON DELETE CASCADE` on `order_id` remains at the database level as a schema-level safety net but is not exercised through normal application use.

## Relationships

```text
auth.users
    |
    | 1:1
    v
profiles
    |
    | 1:many
    v
customers
    |
    | 1:many
    v
orders
    |
    | 1:many
    v
transactions
```

## Security

Row Level Security is enabled on all application tables.

Users must only be able to access records belonging to themselves.

Customer ownership is determined through:

`customers.user_id = auth.uid()`

Orders inherit ownership through their customer.

Transactions inherit ownership through their order and customer.

## Important Rules

Do not create separate `open_orders` and `closed_orders` tables.

Opening and closing are represented by `orders.order_type`.

Order lifecycle is represented by `orders.status`.

Do not store user passwords in application tables.

Supabase Auth manages passwords and authentication.

Transactions are separate from orders because one order may have multiple payments.

For example:

```text
Order: $500
    |
    +-- Transaction: $200 deposit
    |
    +-- Transaction: $300 final payment
```

## Indexes

Indexes currently exist on:

- customers.user_id
- customers.name
- orders.customer_id
- orders.scheduled_date
- orders.status
- transactions.order_id
- transactions.transaction_date

## Timestamps

All tables use:

- created_at
- updated_at

`updated_at` is automatically updated by a database trigger whenever a row changes.