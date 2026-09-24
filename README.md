# SIAGA - Smart Internal Approval & Ticketing System

**Versi**: 1.0.0 | **Status**: Production Ready | **Last Updated**: September 2026

Sistem approval dan ticketing internal yang dirancang untuk lingkungan perbankan dengan implementasi prinsip **maker-checker**, **segregation of duties**, dan **audit trail immutable**.

---

## 📋 Daftar Isi

- [Ringkasan Aplikasi](#ringkasan-aplikasi)
- [Tujuan Aplikasi](#tujuan-aplikasi)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Skema Database](#skema-database)
- [Alur Bisnis](#alur-bisnis)
- [API Endpoints](#api-endpoints)
- [Fungsi Kode](#fungsi-kode)
- [Panduan Setup](#panduan-setup)
- [Demo Credentials](#demo-credentials)

---

## 🎯 Ringkasan Aplikasi

### Tujuan Aplikasi

SIAGA adalah solusi approval dan ticketing untuk organisasi yang membutuhkan:

1. **Multi-Level Approval Workflow**: Request dapat memerlukan persetujuan bertingkat dari multiple approver
2. **Maker-Checker Principle**: Pembuat request tidak bisa approve request mereka sendiri (segregation of duties)
3. **Immutable Audit Trail**: Setiap aksi dicatat dan tidak dapat diubah untuk compliance
4. **Role-Based Access Control**: Akses fitur dibatasi berdasarkan role pengguna
5. **Notification System**: Real-time notifikasi untuk setiap perubahan status request

### Target Users

- **Requester**: Karyawan yang mengajukan request (cuti, akses sistem, IT support)
- **Approver**: Manager/supervisor yang mereview dan menyetujui request
- **IT Support**: Tim yang menangani IT Support tickets
- **Admin**: Superuser yang mengelola user, kategori, dan sistem

---

## 🏗️ Arsitektur Sistem

### Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Frontend** | Next.js + React | 14.2 + 18 |
| **Styling** | Tailwind CSS | 3.4 |
| **Backend** | Node.js + Next.js API Routes | 14.2 |
| **Database** | PostgreSQL | 12+ |
| **Authentication** | JWT (HMAC-SHA256) | - |
| **Password Hashing** | bcryptjs | 3.0 |
| **Type System** | TypeScript | 5.0 |

### Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Login Page  │  │ Dashboard   │  │ Request Management   │ │
│  │             │  │ - Stats     │  │ - Create Request     │ │
│  │             │  │ - Charts    │  │ - Approve/Reject     │ │
│  │             │  │ - Requests  │  │ - Edit Profile       │ │
│  └─────────────┘  └─────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
              Next.js API Routes (Backend)
                           ↕
             ┌───────────────────────────────┐
             │    PostgreSQL Database         │
             │  - Users & Roles              │
             │  - Requests & Approval Steps  │
             │  - Audit Logs (Immutable)     │
             │  - Notifications              │
             └───────────────────────────────┘
```

---

## 📊 Skema Database

### Entity Relationship Diagram (ERD)

```
┌─────────────────┐         ┌──────────────────────┐
│      users      │         │       requests        │
├─────────────────┤         ├──────────────────────┤
│ id (PK)         │◄────────│ id (PK)              │
│ name            │  1   N  │ requester_id (FK)    │
│ email (UNIQUE)  │         │ category_id (FK)     │
│ password_hash   │         │ title                │
│ role (ENUM)     │         │ description          │
│ department      │         │ priority             │
│ is_active       │         │ status               │
│ created_at      │         │ current_level        │
│ updated_at      │         │ leave_date           │
└─────────────────┘         │ created_at           │
         │                  │ updated_at           │
         │                  └──────────────────────┘
         │                            │
         │                  ┌──────────────────────┐
         │                  │   approval_steps     │
         │                  ├──────────────────────┤
         │                  │ id (PK)              │
         │                  │ request_id (FK)      │
         │                  │ approver_id (FK)     │
         │                  │ level                │
         │                  │ action               │
         │                  │ notes                │
         │                  │ acted_at             │
         │                  └──────────────────────┘
         │
┌────────────────────┐     ┌──────────────────────┐
│   categories       │     │    attachments       │
├────────────────────┤     ├──────────────────────┤
│ id (PK)            │◄────│ id (PK)              │
│ name (UNIQUE)      │  1  │ request_id (FK)      │
│ description        │  N  │ file_name            │
│ requires_levels    │     │ file_url             │
│ is_active          │     │ uploaded_at          │
└────────────────────┘     └──────────────────────┘

┌──────────────────────────────────────────────────────┐
│              audit_logs (IMMUTABLE)                  │
├──────────────────────────────────────────────────────┤
│ id (PK) | actor_id (FK) | action_type               │
│ target_type | target_id | description               │
│ ip_address | user_agent | created_at (no updates)   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│             notifications                            │
├──────────────────────────────────────────────────────┤
│ id (PK) | recipient_id (FK) | request_id (FK)       │
│ message | is_read | created_at                       │
└──────────────────────────────────────────────────────┘
```

### Tabel Details

#### 1. **users** - Data Pengguna Sistem

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(100) | NOT NULL | Nama lengkap user |
| email | VARCHAR(150) | UNIQUE, NOT NULL | Email login (unik) |
| password_hash | TEXT | NOT NULL | Hash bcrypt (cost=10) |
| role | VARCHAR(20) | CHECK | requester / approver / it_support / admin |
| department | VARCHAR(100) | NULLABLE | Departemen user |
| is_active | BOOLEAN | DEFAULT TRUE | Flag soft-deactivation |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Update terakhir |

**Business Logic**:
- Email harus unik untuk mencegah duplikasi akun
- Password di-hash dengan bcryptjs cost factor 10
- `is_active` memungkinkan soft-deactivation tanpa menghapus historical data
- Role menentukan fitur dan endpoint yang dapat diakses

#### 2. **categories** - Tipe Request

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Nama kategori (mis: "Cuti Karyawan") |
| description | TEXT | NULLABLE | Penjelasan tipe request |
| requires_levels | SMALLINT | CHECK(1,2) | 1 = single approval, 2 = multi-level |
| is_active | BOOLEAN | DEFAULT TRUE | Flag aktivasi kategori |

**Business Logic**:
- `requires_levels = 1`: Hanya perlu 1 approver
- `requires_levels = 2`: Perlu persetujuan bertingkat dari 2 approver
- Kategori nonaktif tidak muncul di form pengajuan

#### 3. **requests** - Request yang Diajukan

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| requester_id | INTEGER | FK → users.id | Pembuat request |
| category_id | INTEGER | FK → categories.id | Tipe request |
| title | VARCHAR(200) | NOT NULL | Judul singkat |
| description | TEXT | NOT NULL | Deskripsi detail & justifikasi |
| priority | VARCHAR(10) | CHECK('low','medium','high') | Tingkat prioritas |
| status | VARCHAR(20) | CHECK | draft / pending / in_review / approved / rejected / revision |
| current_level | SMALLINT | DEFAULT 1 | Level approval terkini (1 atau 2) |
| leave_date | DATE | NULLABLE | Tanggal cuti (khusus kategori cuti) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pengajuan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Update terakhir |

**Status Flow**:
```
draft → pending → in_review → approved
               ↓              ↑
               revision ←─────┘
               ↓
             rejected
```

**Business Logic**:
- `current_level` melacak posisi dalam workflow approval
- Requester tidak bisa approve request mereka sendiri (maker-checker)
- Request status `revision` bisa di-resubmit untuk perbaikan
- Hanya status `pending` atau `draft` yang bisa dibatalkan

#### 4. **approval_steps** - History Approval

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_id | INTEGER | FK → requests.id | Request yang di-approve |
| approver_id | INTEGER | FK → users.id | User yang approve |
| level | SMALLINT | NOT NULL | Level approval (1 atau 2) |
| action | VARCHAR(20) | CHECK | approved / rejected / revision_needed |
| notes | TEXT | NULLABLE | Catatan/alasan dari approver |
| acted_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu approval |

**Business Logic**:
- Setiap approval step adalah immutable record
- Multiple approvals per request = multiple records
- Notes wajib untuk action `rejected` dan `revision_needed`

#### 5. **attachments** - File Lampiran

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_id | INTEGER | FK → requests.id | Request yang memiliki file |
| file_name | VARCHAR(255) | NOT NULL | Nama file original |
| file_url | TEXT | NOT NULL | Path ke file di `public/uploads/` |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu upload |

**Business Logic**:
- File disimpan dengan naming pattern: `{timestamp}-{filename}`
- Multiple attachments per request dimungkinkan
- Edit request: attachment lama dihapus, diganti yang baru

#### 6. **audit_logs** - Immutable Logging ⭐

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| actor_id | INTEGER | FK (ON DELETE SET NULL) | User yang melakukan aksi |
| action_type | VARCHAR(50) | NOT NULL | Jenis aksi |
| target_type | VARCHAR(50) | NULLABLE | request / user / category |
| target_id | INTEGER | NULLABLE | ID dari target |
| description | TEXT | NULLABLE | Human-readable description |
| ip_address | VARCHAR(45) | NULLABLE | IP address requester |
| user_agent | TEXT | NULLABLE | Browser user agent |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp aksi |

**Security Features**:
- **IMMUTABLE**: Tidak ada UPDATE atau DELETE yang diizinkan
- **No Orphan Logs**: User deletion tidak menghapus audit log (actor_id = NULL)
- **Full Context**: IP & user-agent untuk trace teknis
- **Comprehensive**: LOGIN, LOGOUT, CREATE_REQUEST, UPDATE_REQUEST, APPROVED, REJECTED, etc

#### 7. **notifications** - Notifikasi User

| Kolom | Type | Constraint | Fungsi |
|-------|------|-----------|--------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| recipient_id | INTEGER | FK → users.id | Penerima notifikasi |
| request_id | INTEGER | FK (NULLABLE) | Request terkait |
| message | TEXT | NOT NULL | Pesan notifikasi |
| is_read | BOOLEAN | DEFAULT FALSE | Flag status baca |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu notifikasi |

**Business Logic**:
- Auto-created saat ada perubahan status request
- Trigger untuk: request submitted, approved, rejected, revision needed
- is_read diupdate saat user membuka notifikasi

---

## 🔄 Alur Bisnis

### 1. Alur Approval Request (Maker-Checker)

```
START
  │
  ├─→ STEP 1: Requester Submit Request
  │   • Fill form (kategori, judul, deskripsi, prioritas)
  │   • Upload file lampiran (optional)
  │   • Backend: INSERT requests (status='pending', current_level=1)
  │   • INSERT attachments & audit_logs
  │   • NOTIFY semua approver L1
  │
  ├─→ STEP 2: Approver L1 Review & Decision
  │   • Option A: APPROVE
  │   │   ├─ Jika requires_levels=1 → status='approved' (END)
  │   │   └─ Jika requires_levels=2 → status='in_review', level=2
  │   │
  │   • Option B: REJECT (wajib notes)
  │   │   └─ status='rejected' (END)
  │   │
  │   • Option C: REQUEST REVISION (wajib notes)
  │       └─ status='revision' (tunggu resubmit)
  │
  └─→ STEP 3 (jika multi-level): Approver L2 Review
      • Same options: APPROVE / REJECT / REVISION
```

### 2. Alur Request Revision

```
Requester lihat request status='revision'
  ↓
Click "Edit & Resubmit"
  ├─ Form pre-filled dengan data lama
  ├─ Update field yang perlu diperbaiki
  ├─ Upload file baru (optional)
  ↓
Backend Actions:
  ├─ UPDATE requests (status='pending', level reset)
  ├─ DELETE old attachments (jika upload baru)
  ├─ INSERT new attachments
  ├─ INSERT audit_logs (UPDATE_REQUEST)
  ├─ NOTIFY approver L1 (resubmitted)
  └─ Status kembali ke pending
```

### 3. Maker-Checker Enforcement

```
Scenario: Requester mencoba approve request mereka sendiri

Frontend: Show APPROVE button (user role='approver')
  ↓
User click APPROVE
  ↓
Backend Validation (CRITICAL):
  IF requester_id == user.id AND action='approved'
    → REJECT 403 Forbidden
    → Log attempted violation di audit_logs
  ELSE
    → Process approval normally
```

---

## 🔌 API Endpoints

### Authentication Endpoints

#### POST `/api/auth/login`
**Fungsi**: Autentikasi user dan generate JWT token

**Request**:
```json
{ "email": "user@siaga.local", "password": "password123" }
```

**Response (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "Budi Santoso", "role": "requester" }
}
```

#### POST `/api/auth/logout`
**Fungsi**: Logout dan log aksi di audit trail

---

### Profile Endpoints

#### GET `/api/profile`
**Fungsi**: Fetch profil user yang sedang login

#### PATCH `/api/profile`
**Fungsi**: Update profil (name & department)

#### POST `/api/profile/change-password`
**Fungsi**: Change password dengan validasi old password

---

### Request Endpoints

#### GET `/api/requests`
**Fungsi**: Fetch list requests dengan filtering, sorting, pagination
- Filter berdasarkan role (requester hanya lihat milik sendiri, approver lihat pending, admin lihat semua)
- Sort: newest, oldest, priority-high
- Pagination: page, pageSize

#### POST `/api/requests`
**Fungsi**: Create new request
- FormData upload dengan file (optional)
- Auto-notify approver L1
- Transaction: INSERT requests, attachments, notifications, audit_logs

#### POST `/api/requests/{id}/approve`
**Fungsi**: Process approval action (approve/reject/revision)
- Validasi maker-checker (requester ≠ approver)
- Validasi duplicate approval per level
- Notes wajib untuk reject/revision
- Update request status & create notifications

---

### User Management Endpoints (Admin Only)

#### GET `/api/users`
**Fungsi**: Fetch list semua users

#### POST `/api/users`
**Fungsi**: Create new user
- Generate random password
- Hash dengan bcryptjs
- Return temporary password untuk copy

#### PATCH `/api/users/{id}`
**Fungsi**: Activate/Deactivate user
- Validasi user tidak bisa deactivate dirinya sendiri
- Log aksi di audit_logs

---

### Category Management Endpoints (Admin Only)

#### GET `/api/admin/categories`
**Fungsi**: Fetch all categories (active & inactive)

#### POST `/api/admin/categories`
**Fungsi**: Create new category dengan requires_levels

#### PATCH `/api/admin/categories/{id}`
**Fungsi**: Activate/Deactivate category

---

### Notification & Audit Endpoints

#### GET `/api/notifications`
**Fungsi**: Fetch unread notifications untuk current user

#### PATCH `/api/notifications`
**Fungsi**: Mark notification as read

#### GET `/api/audit-logs`
**Fungsi**: Fetch audit logs dengan filtering
- Filter: action_type, actor name, date range
- Limit 200 records per query
- Export to CSV via frontend

---

## 🛠️ Fungsi Kode

### Frontend Components

#### DashboardLayout (`src/app/dashboard/layout.tsx`)
**Fungsi**: Layout wrapper untuk semua dashboard pages
- Topbar dengan logo, user info, notifications bell
- Sidebar dengan role-based navigation
- Mobile hamburger menu
- Auto-fetch notifikasi setiap 30 detik
- Notification dropdown dengan unread count

**Role-Based Navigation**:
- Requester: My Requests, New Request
- Approver: Approval Queue
- IT Support: IT Support Queue
- Admin: Dashboard, Users, Categories, Audit Trail

#### DashboardPage (`src/app/dashboard/page.tsx`)
**Fungsi**: Main dashboard dengan stats dan overview
- **Stat Cards**: Total Request, Pending, Approved, Rejected, Approval Rate
- **Charts**: Request per Kategori (horizontal bar), Tren 7 Hari (vertical bar)
- **Request Table**: Filter, sort, pagination dengan role-based data
- Role-specific filtering applied server-side

#### NewRequestPage (`src/app/dashboard/new/page.tsx`)
**Fungsi**: Create new request form
- Category dropdown (fetch dari GET /api/categories)
- Conditional fields: date picker jika kategori contains "cuti"
- Priority radio buttons, file upload (optional)
- Client-side validasi sebelum submit
- FormData upload ke POST /api/requests

#### RequestDetailPage (`src/app/dashboard/requests/{id}/page.tsx`)
**Fungsi**: View request detail & perform approval actions
- Display request info, requester, category, priority, leave_date
- Attachments list dengan preview (image inline, PDF iframe)
- Approval timeline chronological dari approval_steps
- Role-specific action panels:
  - **Requester (revision)**: Edit & Resubmit, Cancel
  - **Approver (pending/in_review)**: Approve, Request Revision, Reject (notes wajib)
  - **IT Support**: Notes + file upload untuk resolve ticket

#### ProfilePage (`src/app/dashboard/profile/page.tsx`)
**Fungsi**: User profile management
- Display: role, email, department, member since date
- Edit form untuk name & department
- Collapsible change password section
- Client-side validasi: passwords match, length >= 6
- Success/error messages dengan auto-clear 5 detik

#### UsersPage (`src/app/dashboard/users/page.tsx`)
**Fungsi**: User management admin panel
- Create user form (collapsible) dengan copy-to-clipboard temp password
- User list table dengan status badges (Aktif/Nonaktif)
- Toggle button untuk activate/deactivate dengan confirmation dialog

#### CategoriesPage (`src/app/dashboard/categories/page.tsx`)
**Fungsi**: Category management admin panel
- Create category form dengan requires_levels radio (1 atau 2)
- Category list table dengan status badges
- Toggle untuk activate/deactivate

#### AuditTrailPage (`src/app/dashboard/audit/page.tsx`)
**Fungsi**: Audit log viewer & exporter
- Filter controls: actor search, action type dropdown, date range
- Read-only table dengan columns: Waktu, Aktor, Aksi, Target, IP, Deskripsi
- Client-side CSV export dengan filename: `audit-trail-{date}.csv`
- Pagination dengan LIMIT 200 records

### Backend API Functions

#### `/api/auth/login` & `/api/auth/logout`
**Fungsi**:
- Query user by email
- Validasi user active & password via bcrypt.compare()
- Sign JWT token dengan expiresIn=8h
- Log aksi di audit_logs (LOGIN/LOGOUT/LOGIN_FAILED)

#### `/api/profile` (GET/PATCH)
**Fungsi**:
- Extract user dari JWT token
- Validasi input & role
- Transaction: UPDATE users, INSERT audit_logs
- Return updated user data

#### `/api/profile/change-password`
**Fungsi**:
- Validasi old password via bcrypt.compare()
- Validasi new password & confirm match
- Validasi length >= 6 characters
- Transaction: Hash new password, UPDATE users.password_hash, INSERT audit_logs

#### `/api/requests` (GET/POST)
**Fungsi**:
- **GET**: Role-based filtering, search, sort, pagination
  - Requester: hanya lihat requests milik sendiri
  - Approver: lihat pending/in_review (bukan IT Support)
  - IT Support: lihat pending/in_review kategori IT Support
  - Admin: lihat semua requests
  
- **POST**: Create request dengan file upload
  - Validasi input (category_id, title, description)
  - Validasi user.role == 'requester'
  - Transaction:
    1. INSERT requests (status='pending', current_level=1)
    2. Jika ada file: mkdir public/uploads, save dengan naming `{timestamp}-{filename}`, INSERT attachments
    3. Query kategori, fetch approver L1
    4. INSERT notifications ke setiap approver
    5. INSERT audit_logs (CREATE_REQUEST)
    6. COMMIT

#### `/api/requests/{id}/approve`
**Fungsi**: Process approval action
- **Validasi**:
  - User.role must be 'approver'
  - Request status must be 'pending' atau 'in_review'
  - Maker-checker: approver_id ≠ requester_id (jika action='approved')
  - Duplicate check: tidak boleh ada approval dari user ini di level yang sama
  - Notes wajib jika action='rejected' atau 'revision_needed'

- **Transaction**:
  1. INSERT approval_steps (record keputusan approver)
  2. Update request status:
     - Jika action='rejected' → status='rejected' (END)
     - Jika action='revision_needed' → status='revision'
     - Jika action='approved' → check current_level vs requires_levels
       - Jika current_level < requires_levels → status='in_review', level++, NOTIFY approver L2
       - Else → status='approved', NOTIFY requester
  3. CREATE notifications untuk pihak terkait
  4. INSERT audit_logs
  5. COMMIT

#### `/api/users` (GET/POST/PATCH)
**Fungsi**:
- **GET**: Fetch all users (admin only)
- **POST**: Create new user (admin only)
  - Validasi input (name, email, role)
  - Cek email tidak sudah exist
  - Generate random password
  - Hash password dengan bcryptjs cost=10
  - Transaction: INSERT users (is_active=TRUE), INSERT audit_logs (CREATE_USER)
  
- **PATCH**: Activate/Deactivate user (admin only)
  - Validasi user tidak bisa deactivate dirinya sendiri
  - Transaction: UPDATE users.is_active, INSERT audit_logs

#### `/api/admin/categories` (GET/POST/PATCH)
**Fungsi**:
- **GET**: Fetch all categories (active & inactive)
- **POST**: Create new category
  - Validasi input (name unique, requires_levels)
  - Transaction: INSERT categories, INSERT audit_logs
  
- **PATCH**: Activate/Deactivate category
  - Transaction: UPDATE categories.is_active, INSERT audit_logs

#### `/api/notifications` (GET/PATCH)
**Fungsi**:
- **GET**: Fetch unread notifications untuk current user
- **PATCH**: Mark notification as read
  - Update is_read flag

#### `/api/audit-logs`
**Fungsi**: Fetch audit logs dengan filtering (admin only)
- Filter: action_type, actor name (ILIKE search), date range (from/to)
- Limit 200 records max per query
- Return: actor_id, actor_name, action_type, target_type, ip_address, user_agent, created_at

---

## 🚀 Panduan Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm atau yarn

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/BerlinNapoleon/SIAGA.git
   cd SIAGA/siaga-web
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   ```bash
   cat > .env << EOF
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/siaga
   JWT_SECRET=your-secret-key-here-min-32-chars
   EOF
   ```

4. **Create Database**
   ```bash
   psql -U postgres
   CREATE DATABASE siaga;
   \q
   ```

5. **Run Migrations**
   ```bash
   # Run schema creation
   psql -U postgres -d siaga -f scripts/schema.sql
   
   # Seed initial data
   node scripts/init-db.js
   node scripts/seed-users.js
   node scripts/seed-categories.js
   node scripts/migrate-it-support.js
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```
   Aplikasi berjalan di `http://localhost:3000`

---

## 🔐 Demo Credentials

```
Admin User:
Email: admin@siaga.local
Password: password

Requester:
Email: budi@siaga.local
Password: password

Approver:
Email: sari@siaga.local
Password: password

IT Support:
Email: raka@siaga.local
Password: password
```

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT Token**: Payload `{id, role, name}`, Expiry 8 hours, HMAC-SHA256
- **RBAC**: requester / approver / it_support / admin dengan endpoint protection

### Data Protection
- **Password Hashing**: bcryptjs cost factor 10
- **SQL Injection Prevention**: Parameterized queries (prepared statements)
- **Transaction Safety**: Dedicated client connection, ACID compliance

### Business Logic Security
- **Maker-Checker**: Backend validation (requester ≠ approver untuk approval)
- **Duplicate Prevention**: Approver tidak bisa approve request 2x di level yang sama
- **Immutable Audit Trail**: No UPDATE/DELETE pada audit_logs table

---

## 📚 Tech Stack & Dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "dotenv": "^18.0.3",
    "jsonwebtoken": "^9.0.3",
    "next": "14.2.35",
    "pg": "^8.23.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20",
    "@types/pg": "^8.23.1",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.35",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

---

## 📖 Dokumentasi Lengkap

Untuk dokumentasi lebih detail tentang API endpoints, workflow business logic, dan troubleshooting, lihat file `DOCUMENTATION.md`.

---

## 📄 License & Contact

**Repository**: https://github.com/BerlinNapoleon/SIAGA  
**License**: Proprietary - CIMB IT Graduate Programme  
**Contact**: dev@siaga.local

---

**Status**: Production Ready | **Last Updated**: September 2026
