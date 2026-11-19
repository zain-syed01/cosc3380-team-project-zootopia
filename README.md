# Zootopia Zoo

Full-stack zoo management and visitor app: staff dashboards for animals, enclosures, shops, and reports, plus customer ticketing and an online gift shop.

## Stack

- **Frontend:** React (Vite) + React Router + Clerk (customer auth)
- **Backend:** Express + Prisma + MySQL
- **Auth:** Clerk email/password for customers; bcrypt + JWT for staff (`@zoo.com`)

## Demo logins

### Staff (app login at `/login`)

Password for seeded staff accounts: `pass123`

| Role | Username | Email |
|------|----------|-------|
| Manager | `morgan` | `morgan@zoo.com` |
| Zookeeper | `alex` | `alex@zoo.com` |
| Cashier | `quinn` | `quinn@zoo.com` |

### Customers (Clerk at `/customer-login` or `/signup`)

Customers sign up with **email + password** in Clerk (social login is optional and can stay off).

- Use a throwaway/fake email for demos
- Staff emails (`*@zoo.com`) cannot be used for customer accounts
- If you already have seed customer emails in MySQL (`ava@email.com`, etc.), signing up in Clerk with the same email links that row

## Setup

### 1. Database

In MySQL, run from `database/` in order:

1. `final_zoo_db.sql`
2. `triggers.sql`
3. `views.sql`
4. `seed_data.sql`

If you already have an older database, also run:

- `migration_staff_auth.sql` (hash plaintext `pass123` passwords)
- `migration_clerk.sql` (add `customer.ClerkUserId`)

### 2. Environment

Copy `.env_example` to `backend/.env` and fill in MySQL + secrets:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=final_zoo_db
PORT=3000
DB_SSL=false
JWT_SECRET=change-me-to-a-long-random-string
CLERK_SECRET_KEY=sk_test_...
```

Create `frontend/.env` from `frontend/.env.example`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 3. Clerk dashboard checklist

1. Create a Clerk application
2. Enable **Email + password**
3. Turn **off** email verification for local/demo use (or use real inboxes)
4. Optionally disable Google/social providers
5. Add allowed origins/redirects for `http://localhost:5173` and your deployed frontend URL
6. Paste the publishable key into `frontend/.env` and the secret key into `backend/.env`

### 4. Run locally

```
cd backend
npm install
npm start
```

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Project layout

- `database/` — schema, triggers, views, seed data, migrations
- `backend/` — Express API, Prisma schema, auth middleware
- `frontend/` — React app (`src/pages/`, staff + customer UIs)

## Notes

- Staff API writes and reports require a staff JWT (`Authorization: Bearer …`)
- Customer checkout and “my transactions” require a Clerk session
- Public GETs (animals, enclosures, attractions, products) stay open for the visitor site
