# Pool Business Management App

## Overview

A mobile-first business management application for a pool opening and closing business.

The application is initially being built for a single business owner, Branden, but the architecture should support multiple users/businesses in the future.

The primary use case is allowing the business owner to manage customers, schedule pool opening/closing jobs, track orders, and record payments.

## Goals

The application should allow the business owner to:

1. Manage customers.
2. View and manage a schedule of pool jobs.
3. Create and manage pool opening and closing orders.
4. Track payments and transactions.
5. Quickly access customer information while working.
6. Use the application from an iPhone.
7. Use the application from a desktop web browser.

## Platforms

### Mobile

The primary mobile platform is iOS.

The application will be built with React Native and Expo so the same application can eventually support Android.

### Web

A separate web application will provide the same core functionality through a desktop browser.

## V1 Features

### Authentication

- User login
- User logout
- Persistent authenticated session
- Supabase Auth handles authentication
- User profile contains name and company name

### Customers

Users can:

- Create a customer
- View customers
- Search customers
- View customer details
- Edit customer information
- Delete customers

Customer information:

- Name
- Phone
- Email
- Street
- City
- State
- ZIP code
- Pool size
- Notes
- Date added

The mobile application should make phone numbers tappable so the user can quickly call a customer.

Email addresses should also be tappable where appropriate.

### Orders

Users can:

- Create an order
- Assign an order to a customer
- Select opening or closing
- Set scheduled date/time
- Set price
- Add notes
- Mark an order completed
- Cancel an order
- View order details
- Edit an order

Order types:

- Opening
- Closing

Order statuses:

- Scheduled
- Completed
- Cancelled

### Schedule

The application should provide:

- Today's scheduled jobs
- Upcoming jobs
- Calendar view
- Ability to select a scheduled job
- Ability to navigate from a job to the customer and order details

The schedule is based on the scheduled date/time stored on orders.

A separate schedule database table is not required for V1.

### Transactions

Users can:

- Record a payment
- View payments associated with an order
- Edit a transaction
- Delete a transaction

Transaction information:

- Amount
- Transaction date
- Payment method
- Notes

Payment methods:

- Cash
- Check
- Card
- Other

An order may have multiple transactions.

This allows future support for deposits and partial payments.

### Dashboard

The dashboard should provide a quick overview of the business.

Potential information:

- Today's jobs
- Upcoming jobs
- Scheduled revenue
- Unpaid amounts
- Current month revenue

The dashboard should prioritize useful information over visual complexity.

## V1 Non-Goals

The following features should NOT be implemented in V1:

- Employee management
- Customer accounts
- Customer login
- Online customer portal
- Automated billing
- Online payment processing
- Credit card processing
- In-app messaging
- Push notifications
- SMS messaging
- Email marketing
- Inventory management
- Route optimization
- Advanced reporting
- Accounting integrations
- QuickBooks integration
- Multiple businesses within one account
- Complex permissions/roles
- File uploads
- Photos
- Comments
- Social features

These features may be considered in future versions.

## Design Principles

### Mobile first

The primary user will use the application from an iPhone while working.

The mobile interface should prioritize:

- Large touch targets
- Simple navigation
- Fast data entry
- Minimal typing
- Easy access to today's jobs
- Easy access to customer contact information

### Simple over complex

The application should avoid unnecessary complexity.

A business owner should be able to perform common actions without navigating through many screens.

### Fast

Common operations should require as few taps as reasonably possible.

### Maintainable

The codebase should be organized and documented so another developer can understand it.

### Secure

Customer and business data must not be publicly accessible.

Supabase Row Level Security must enforce user-level data isolation.

## Future Possibilities

Possible future features include:

- Multiple employees
- Employee scheduling
- Customer portal
- Automated reminders
- SMS notifications
- Email notifications
- Online payments
- Recurring customers
- Route optimization
- Revenue reports
- Expense tracking
- Inventory
- QuickBooks integration
- Photo attachments
- Service history
- Customer notes/history
- Android release