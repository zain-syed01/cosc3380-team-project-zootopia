# Zootopia Zoo

Full-stack zoo management and visitor app: staff dashboards for animals, enclosures, shops, and reports, plus customer ticketing and an online gift shop.

## Stack

- **Frontend:** React (Vite) + React Router
- **Backend:** Express + Prisma + MySQL
- **Auth:** bcrypt + JWT for staff and customers (no third-party auth)

## Demo logins

Password for all seeded accounts: `pass123`

### Staff (`/login`)

| Role | Username | Email |
|------|----------|-------|
| Manager | `morgan` | `morgan@zoo.com` |
| Zookeeper | `alex` | `alex@zoo.com` |
| Cashier | `quinn` | `quinn@zoo.com` |

### Customers (`/login` or `/signup`)

| Username | Email |
|----------|-------|
| `ava` | `ava@email.com` |
| `jordan` | `jordan@email.com` |
| `sam` | `sam@email.com` |
| `riley` | `riley@email.com` |

New visitors can also create an account at `/signup` (username + email + password). Staff emails (`*@zoo.com`) cannot be used for customer accounts.

## Setup

### 1. Database

In MySQL, run from `database/` in order:

1. `final_zoo_db.sql`
2. `triggers.sql`
3. `views.sql`
4. `seed_data.sql`

### 2. Environment

Copy `.env_example` to `backend/.env` and fill in MySQL + JWT:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=final_zoo_db
PORT=3000
DB_SSL=false
JWT_SECRET=change-me-to-a-long-random-string
```

No frontend env file is required for auth.

### 3. Run locally

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
- Customer checkout and “my transactions” require a customer JWT
- Public GETs (animals, enclosures, attractions, products) stay open for the visitor site
