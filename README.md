# 🚗 Espaço Braite - Service Order Management System

**🇧🇷 Project developed by a Brazilian developer.**
All technical details, examples, and data inside the system are in **Brazilian Portuguese**, since this SaaS was built specifically for car wash and automotive detailing businesses in Brazil.

---

## 🧩 Overview

**Espaço Braite** is a **multi-tenant SaaS platform** for managing car wash and auto detailing shops.
It provides complete control over **service orders, customers, team, payments, and reports**, all in a modern web environment built with **Next.js, PostgreSQL, and JWT authentication**.

---

## 🎨 Features

* **Multi-tenant**: Each car wash has its own isolated account
* **JWT Authentication**: Secure login with access and refresh tokens
* **RBAC System**: 4 permission levels (owner, manager, attendant, viewer)
* **Dashboard**: Real-time revenue analytics (Today, 15 days, 30 days)
* **Service Orders (O.S.)**: Complete creation and management
* **PDF Generation**: Download O.S. with company logo and branding
* **Client Management**: Full registration including vehicle data
* **Service Catalog**: Custom prices and descriptions per tenant
* **Email Invitations**: Invite new team members (Nodemailer + Ethereal)
* **Braite Theme**: Clean white interface with blue tone `#0071CE`
* **Brazilian Timezone**: All reports use `America/Sao_Paulo`
* **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui
* **Backend**: Next.js API Routes (Node.js)
* **Database**: PostgreSQL (Railway)
* **Authentication**: JWT (`jsonwebtoken`), `bcryptjs`
* **PDF Generation**: Puppeteer
* **Email**: Nodemailer (Ethereal for development)

---

## 📋 Requirements

* Node.js 18+
* PostgreSQL (Railway or local instance)
* Yarn

---

## 🚀 Installation & Setup

### 1. Clone and install dependencies

```bash
cd /app
yarn install
```

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit your `.env` file:

```env
# Database (required)
DATABASE_URL=postgresql://user:pass@host:5432/database

# JWT (optional - defaults included)
JWT_SECRET=espaco-braite-jwt-secret-2024-production-change-this
JWT_REFRESH_SECRET=espaco-braite-refresh-secret-2024-production-change-this

# Email (optional - uses Ethereal by default)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@espacobraite.com

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Run migrations and seed

```bash
# Recommended
curl http://localhost:3000/api/setup
```

This will create:

* All PostgreSQL tables
* Demo tenant: “Espaço Braite Demo”
* Admin user: `admin1` / password: `123` (`admin1@braite.test`)
* Example services, client, and paid order

### 4. Start the server

```bash
yarn dev
# Server running at http://localhost:3000
```

---

## 🔐 Demo Credentials

```
User: admin1
Password: 123
```

or

```
Email: admin1@braite.test
Password: 123
```

---

## 📊 Database Structure

### Tables

* `tenants` – Car wash locations (multi-tenant)
* `users` – System users
* `user_tenants` – User ↔ tenant relationship
* `clients` – Customers (per tenant)
* `catalog_items` – Service catalog
* `orders` – Service orders
* `order_items` – Order items
* `invite_tokens` – Pending invitations (7 days expiration)
* `audit_logs` – System logs

### Roles (RBAC)

1. **owner** – Full control
2. **manager** – Manage O.S., services, and team (except owner)
3. **attendant** – Create/edit O.S., mark payments
4. **viewer** – Read-only access

---

## 🎯 Main Features

### Dashboard

* “Hoje”: Daily revenue (America/Sao_Paulo timezone)
* “Últimos 15 dias”: Total paid orders in the last 15 days
* “Últimos 30 dias”: Total paid orders in the last 30 days
* Recent orders list

### Service Orders

* Create multiple services per order
* Select client and vehicle
* Status: Pending, In Progress, Completed, Paid, Canceled
* Payment method and notes
* PDF download with Braite branding

### Clients

* Full registration with vehicle info
* Order history

### Services

* Name, description, price, estimated duration
* Custom catalog per tenant

### Team

* Email invitation (expires in 7 days)
* Role management
* Member list

---

## 📄 API Endpoints

### Public

* `POST /api/auth/login`
* `POST /api/auth/refresh`
* `GET /api/setup`

### Protected (JWT required)

* `GET /api/me`
* `GET /api/dashboard`
* `GET /api/clients`
* `POST /api/clients`
* `GET /api/services`
* `POST /api/services`
* `GET /api/orders`
* `POST /api/orders`
* `PUT /api/orders/:id`
* `GET /api/orders/:id/pdf`
* `GET /api/team`
* `POST /api/team/invite`

---

## 🖼️ Logo & Branding

Logo file:

```
/public/assets/logo/teste.png
```

Used on:

* Login screen
* Dashboard sidebar
* Service order PDFs

Primary color: `#0071CE`

---

## 📧 Email System

By default, uses **Ethereal (test email)**.
For production, configure your SMTP in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@espacobraite.com
```

---

## 🐛 Troubleshooting

### PostgreSQL connection error

Check your `DATABASE_URL` string.

### Migrations didn’t run

Execute manually:

```bash
curl http://localhost:3000/api/setup
```

### PDF not generating

Install Puppeteer dependencies (for Linux):

```bash
apt-get install -y chromium
```

---

## 🔄 Timezone

All revenue calculations are based on the **America/Sao_Paulo** timezone for accurate financial reports.

---

## 📦 Main Dependencies

```json
{
  "bcryptjs": "^3.0.2",
  "jsonwebtoken": "^9.0.2",
  "pg": "^8.16.3",
  "puppeteer": "^24.25.0",
  "nodemailer": "^7.0.9",
  "date-fns-tz": "^3.2.0",
  "next": "14.2.3",
  "react": "^18",
  "tailwindcss": "^3.4.1"
}
```


## 🧠 Development Notes

* UUIDs used as primary keys
* JWT tokens expire in 15 min (access) / 7 days (refresh)
* PDFs generated server-side with Puppeteer
* Multi-tenant via `tenant_id` in all queries
* RBAC verified in every protected endpoint

---

## 🚀 Deployment

Ready for deployment on:

* **Vercel** (Next.js native)
* **Railway** (PostgreSQL)
* **AWS / Google Cloud**

Make sure to configure environment variables in your deployment dashboard.


## 📞 Support

System developed for **Espaço Braite — Car Wash & Auto Detailing (Brazil)**.
Created by **José Ferreira 🇧🇷**


**Built with Next.js 14 + PostgreSQL + Tailwind CSS**
