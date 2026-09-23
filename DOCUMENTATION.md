# SIAGA - Smart Internal Approval & Ticketing System
## Dokumentasi Lengkap Aplikasi

**Versi**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: September 2026

---

## Daftar Isi

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Skema Database](#skema-database)
4. [Alur Bisnis](#alur-bisnis)
5. [API Endpoints](#api-endpoints)
6. [Komponen Frontend](#komponen-frontend)
7. [Fitur Keamanan](#fitur-keamanan)
8. [Panduan Setup](#panduan-setup)
9. [Troubleshooting](#troubleshooting)

---

## Ringkasan Eksekutif

### Tujuan Aplikasi

SIAGA adalah sistem approval dan ticketing internal yang dirancang khusus untuk lingkungan perbankan. Aplikasi ini mengimplementasikan prinsip-prinsip kontrol perbankan fundamental: **maker-checker**, **segregation of duties**, dan **audit trail** yang immutable.

### Konteks Bisnis

Dalam operasional perbankan, setiap keputusan dan transaksi harus melewati proses approval berlapis untuk memastikan keamanan dan compliance. SIAGA mensimulasikan workflow approval yang realistis dengan:

- **Multi-Level Approval**: Request dapat memerlukan persetujuan dari multiple approver pada level berbeda
- **Role-Based Access Control**: Akses fitur dibatasi berdasarkan role pengguna (requester, approver, it_support, admin)
- **Immutable Audit Trail**: Setiap aksi dicatat dan tidak dapat diubah atau dihapus
- **Notification System**: User mendapat notifikasi real-time untuk perubahan status request

### Target Users

1. **Requester**: Karyawan yang mengajukan request (cuti, akses sistem, IT support)
2. **Approver**: Manager atau supervisor yang mereview dan menyetujui request
3. **IT Support**: Tim khusus yang menangani IT Support tickets
4. **Admin**: Superuser yang mengelola user, kategori, dan sistem secara keseluruhan

---

## Arsitektur Sistem

### Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Frontend** | Next.js + React | 14.2 + 18 |
| **Styling** | Tailwind CSS | 3.4 |
| **Backend** | Node.js + Next.js API Routes | 14.2 |
| **Database** | PostgreSQL | 12+ |
| **Authentication** | JWT | ES256 |
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
│                         ↕                                      │
│              Next.js API Routes (Backend)                     │
└─────────────────────────────────────────────────────────────┘
                            ↕
            ┌───────────────────────────────┐
            │    PostgreSQL Database         │
            │  - Users & Roles              │
            │  - Requests & Approval Steps  │
            │  - Audit Logs (Immutable)     │
            │  - Notifications              │
            └───────────────────────────────┘
```

### Alur Request-Response

1. **Client** mengirim HTTP request dengan JWT token di header `Authorization: Bearer <token>`
2. **API Route** menerima request dan melakukan autentikasi via `getUserFromRequest()`
3. **Middleware** memvalidasi role dan akses
4. **Database Layer** melakukan operasi CRUD dengan transaction management
5. **Response** dikembalikan ke client dalam format JSON
6. **Frontend** update state dan UI berdasarkan response

---

## Skema Database

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
         │                            │  1
         │                            │
         │                            │ N
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
│ id (PK)                                              │
│ actor_id (FK → users, nullable)                      │
│ action_type (enum)                                   │
│ target_type (request/user/category)                  │
│ target_id                                            │
│ description                                          │
│ ip_address                                           │
│ user_agent                                           │
│ created_at (no updates allowed)                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│             notifications                            │
├──────────────────────────────────────────────────────┤
│ id (PK)                                              │
│ recipient_id (FK → users)                            │
│ request_id (FK → requests, nullable)                 │
│ message                                              │
│ is_read                                              │
│ created_at                                           │
└──────────────────────────────────────────────────────┘
```

### Tabel Details

#### 1. **users**
Menyimpan data pengguna sistem.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(100) | NOT NULL | Nama lengkap user |
| email | VARCHAR(150) | UNIQUE, NOT NULL | Email untuk login |
| password_hash | TEXT | NOT NULL | Hashed password dengan bcrypt |
| role | VARCHAR(20) | CHECK('requester','approver','admin','it_support') | Tipe role user |
| department | VARCHAR(100) | NULLABLE | Departemen user |
| is_active | BOOLEAN | DEFAULT TRUE | Flag aktivasi user |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu update terakhir |

**Business Logic**:
- Setiap user harus memiliki role yang valid untuk mengakses fitur tertentu
- Email harus unik untuk mencegah duplikasi akun
- Password di-hash menggunakan bcryptjs dengan cost factor 10
- is_active memungkinkan soft-deactivation tanpa menghapus historical data

#### 2. **categories**
Menyimpan tipe-tipe request yang dapat diajukan.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Nama kategori (mis: "Cuti Karyawan") |
| description | TEXT | NULLABLE | Penjelasan tipe request |
| requires_levels | SMALLINT | CHECK(1,2), DEFAULT 1 | Jumlah level approval yang dibutuhkan |
| is_active | BOOLEAN | DEFAULT TRUE | Flag aktivasi kategori |

**Business Logic**:
- Kategori dengan `requires_levels = 1` hanya perlu persetujuan dari 1 approver
- Kategori dengan `requires_levels = 2` perlu persetujuan bertingkat dari 2 approver
- Kategori yang dinonaktifkan tidak muncul di form pengajuan request baru
- Unique constraint pada name mencegah duplikasi kategori

#### 3. **requests**
Menyimpan request yang diajukan oleh requester.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| requester_id | INTEGER | FK → users.id | User yang mengajukan request |
| category_id | INTEGER | FK → categories.id | Tipe request |
| title | VARCHAR(200) | NOT NULL | Judul singkat request |
| description | TEXT | NOT NULL | Deskripsi lengkap & justifikasi |
| priority | VARCHAR(10) | CHECK('low','medium','high'), DEFAULT 'medium' | Tingkat prioritas |
| status | VARCHAR(20) | CHECK (lihat tabel status) | Status approval saat ini |
| current_level | SMALLINT | DEFAULT 1 | Level approval terkini (1 atau 2) |
| leave_date | DATE | NULLABLE | Tanggal cuti (khusus kategori cuti) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu pengajuan |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu update terakhir |

**Status Flow**:
```
draft → pending → in_review → approved
                ↓              ↑
                revision ←─────┘
                ↓
              rejected
```

**Business Logic**:
- `current_level` melacak posisi dalam workflow approval multi-level
- Requester tidak bisa approve request mereka sendiri (maker-checker principle)
- Request dapat di-resubmit jika status `revision` untuk perbaikan
- Hanya request dengan status `pending` atau `draft` yang bisa dibatalkan

#### 4. **approval_steps**
Menyimpan history setiap keputusan approval.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_id | INTEGER | FK → requests.id | Request yang di-approve |
| approver_id | INTEGER | FK → users.id | User yang memberikan approval |
| level | SMALLINT | NOT NULL | Level approval (1 atau 2) |
| action | VARCHAR(20) | CHECK('approved','rejected','revision_needed') | Aksi yang diambil |
| notes | TEXT | NULLABLE | Catatan/alasan dari approver |
| acted_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu approval |

**Business Logic**:
- Setiap approval step adalah immutable record dari keputusan
- Multiple approvals untuk request yang sama akan membuat multiple records
- Notes adalah mandatory untuk action `rejected` dan `revision_needed`
- Timeline dapat di-reconstruct dari approval_steps untuk audit purposes

#### 5. **attachments**
Menyimpan file yang di-upload bersama request atau approval.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_id | INTEGER | FK → requests.id | Request yang memiliki file |
| file_name | VARCHAR(255) | NOT NULL | Nama file original |
| file_url | TEXT | NOT NULL | Path ke file di storage |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu upload |

**Business Logic**:
- File disimpan di `public/uploads/` dengan naming pattern `timestamp-filename`
- Multiple attachments per request dimungkinkan
- Saat edit request, attachment lama dihapus dan diganti yang baru
- File URL relative terhadap public folder untuk serving via HTTP

#### 6. **audit_logs** ⭐ (Immutable)
Menyimpan log aktivitas pengguna untuk compliance dan audit.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| actor_id | INTEGER | FK → users.id (ON DELETE SET NULL) | User yang melakukan aksi |
| action_type | VARCHAR(50) | NOT NULL | Jenis aksi (LOGIN, CREATE_REQUEST, APPROVE, dll) |
| target_type | VARCHAR(50) | NULLABLE | Jenis target (request, user, category) |
| target_id | INTEGER | NULLABLE | ID dari target |
| description | TEXT | NULLABLE | Deskripsi human-readable dari aksi |
| ip_address | VARCHAR(45) | NULLABLE | IP address dari requester |
| user_agent | TEXT | NULLABLE | User agent dari browser |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp aksi |

**Security Features**:
- **IMMUTABLE**: Tidak ada UPDATE atau DELETE yang diizinkan pada tabel ini
- **Nullable actor_id**: User deletion tidak menghapus audit log mereka
- **Full Context**: IP address dan user-agent mencatat konteks teknis
- **Comprehensive Coverage**: Semua aksi penting ter-log (LOGIN, LOGOUT, CREATE, UPDATE, APPROVE, REJECT, etc)

**Action Types**:
- `LOGIN` / `LOGOUT` - Autentikasi
- `CREATE_REQUEST`, `UPDATE_REQUEST`, `CANCEL_REQUEST` - Request management
- `APPROVED`, `REJECTED`, `REVISION_NEEDED` - Approval actions
- `CREATE_USER`, `ACTIVATE_USER`, `DEACTIVATE_USER` - User management
- `CREATE_CATEGORY`, `ACTIVATE_CATEGORY`, `DEACTIVATE_CATEGORY` - Category management
- `UPDATE_PROFILE`, `CHANGE_PASSWORD` - Account changes
- `IT_SUPPORT_RESOLVE` - IT Support resolution

#### 7. **notifications**
Menyimpan notifikasi untuk user.

| Kolom | Type | Constraint | Keterangan |
|-------|------|-----------|-----------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| recipient_id | INTEGER | FK → users.id | User yang menerima notifikasi |
| request_id | INTEGER | FK → requests.id (NULLABLE) | Request yang terkait (jika ada) |
| message | TEXT | NOT NULL | Pesan notifikasi |
| is_read | BOOLEAN | DEFAULT FALSE | Flag apakah sudah dibaca |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Waktu notifikasi dibuat |

**Business Logic**:
- Auto-created saat ada perubahan status request
- Notifikasi di-trigger untuk: request submitted, approved, rejected, revision needed
- is_read diupdate saat user membuka notifikasi
- Linked ke request untuk navigasi langsung ke detail request

---

## Alur Bisnis

### 1. Alur Approval Request (Maker-Checker)

```
┌─────────────────────────────────────────────────────────────────┐
│                        START                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Requester Submit Request                                │
├─────────────────────────────────────────────────────────────────┤
│  1. Buka form "New Request"                                      │
│  2. Isi: kategori, judul, deskripsi, prioritas                  │
│  3. Upload file lampiran (opsional)                             │
│  4. Click Submit                                                 │
│                                                                  │
│  Backend Actions:                                                │
│  • INSERT ke requests (status='pending', current_level=1)       │
│  • INSERT attachments jika ada file                             │
│  • INSERT audit_logs (CREATE_REQUEST)                           │
│  • INSERT notifications ke semua approver L1                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Approver L1 Review & Decision                           │
├─────────────────────────────────────────────────────────────────┤
│  Approver melihat request di "Approval Queue"                   │
│                                                                  │
│  Option A: APPROVE                                               │
│  ├─ Jika requires_levels = 1:                                   │
│  │  • UPDATE status='approved'                                  │
│  │  • NOTIFY requester (approved)                               │
│  │  • END PROCESS                                               │
│  │                                                              │
│  └─ Jika requires_levels = 2:                                   │
│     • UPDATE status='in_review', current_level=2                │
│     • NOTIFY approver L2                                        │
│     • CONTINUE to Step 3                                        │
│                                                                  │
│  Option B: REJECT (wajib ada notes)                              │
│  • UPDATE status='rejected'                                     │
│  • INSERT approval_steps (action='rejected', notes=...)         │
│  • NOTIFY requester (rejected + alasan)                         │
│  • INSERT audit_logs (REJECTED)                                 │
│  • END PROCESS                                                  │
│                                                                  │
│  Option C: REQUEST REVISION (wajib ada notes)                    │
│  • UPDATE status='revision'                                     │
│  • INSERT approval_steps (action='revision_needed')             │
│  • NOTIFY requester (revision needed + instruksi)               │
│  • INSERT audit_logs (REVISION_NEEDED)                          │
│  • WAIT for requester to resubmit                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
          ┌──────┴──────┐
          │ Lanjut L2?  │
          └──────┬──────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
   YES                      NO
     │                    (REJECT/REVISI)
     │                       │
     ▼                       ▼
STEP 3                     END
```

### 2. Alur Request Revision

```
┌────────────────────────────────────────────────────┐
│  Requester lihat request dengan status='revision'  │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Click "Edit & Resubmit"                           │
│  • Form pre-filled dengan data lama                │
│  • Update field yang perlu diperbaiki              │
│  • Upload file baru (optional)                     │
│  • Submit                                          │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│  Backend Actions:                                  │
│  • UPDATE requests (status='pending', level reset)│
│  • DELETE old attachments (jika upload baru)      │
│  • INSERT new attachments                         │
│  • INSERT audit_logs (UPDATE_REQUEST)             │
│  • NOTIFY approver L1 (resubmitted)               │
│  • Status kembali ke pending, mulai approval lagi │
└────────────────────────────────────────────────────┘
```

### 3. Alur Maker-Checker Enforcement

```
Scenario: Requester mencoba approve request mereka sendiri

┌──────────────────────────────────────────────────┐
│  Frontend: Show APPROVE button                    │
│  (karena user role = 'approver')                 │
└────────────────┬─────────────────────────────────┘
                 │ User click APPROVE
                 ▼
┌──────────────────────────────────────────────────┐
│  Backend Validation (CRITICAL):                  │
│  IF requester_id == user.id AND action='approved'│
│    ├─ REJECT request with 403 Forbidden          │
│    ├─ Log attempted violation di audit_logs      │
│    └─ RETURN error: "Maker-checker violation"    │
│                                                  │
│  ELSE:                                            │
│    └─ Process approval normally                  │
└──────────────────────────────────────────────────┘

This is enforced at BACKEND level, not just UI.
```

### 4. Alur User Management (Admin Only)

```
┌────────────────────────────┐
│  Admin Panel - Users       │
└────────────────┬───────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
CREATE USER            DEACTIVATE USER
    │                         │
    ├─ Input: name,email,     ├─ Confirmation dialog
    │ role, department        │
    │                         ├─ UPDATE users.is_active=FALSE
    ├─ Generate random        │
    │ password                ├─ INSERT audit_logs
    │                         │
    ├─ Hash password          └─ User tidak bisa login
    │                           (tapi data tetap ada)
    ├─ INSERT users
    │
    ├─ Show temp password
    │ (copy to clipboard)
    │
    └─ INSERT audit_logs
      (CREATE_USER)
```

---

## API Endpoints

### Authentication Endpoints

#### 1. POST `/api/auth/login`
**Purpose**: Autentikasi user dan generate JWT token

**Request**:
```json
{
  "email": "user@siaga.local",
  "password": "password123"
}
```

**Response Success (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "user@siaga.local",
    "role": "requester",
    "department": "Engineering"
  }
}
```

**Response Error (401)**:
```json
{
  "error": "Invalid email or password"
}
```

**Backend Flow**:
1. Query user berdasarkan email
2. Validasi user active dan password via bcrypt.compare()
3. Jika valid, sign JWT token dengan expiresIn=8h
4. INSERT audit_logs (action='LOGIN')
5. Return token + user info
6. Jika invalid, INSERT audit_logs (action='LOGIN_FAILED')

#### 2. POST `/api/auth/logout`
**Purpose**: Logout dan log aksi di audit trail

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true
}
```

**Backend Flow**:
1. Extract user dari JWT token
2. INSERT audit_logs (action='LOGOUT')
3. Frontend: hapus token dari localStorage

---

### Profile Endpoints

#### 3. GET `/api/profile`
**Purpose**: Fetch profil user yang sedang login

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "id": 1,
  "name": "Budi Santoso",
  "email": "budi@siaga.local",
  "role": "requester",
  "department": "Engineering",
  "created_at": "2026-09-20T10:00:00Z"
}
```

#### 4. PATCH `/api/profile`
**Purpose**: Update profil (name & department)

**Request**:
```json
{
  "name": "Budi Santoso Updated",
  "department": "Engineering & Operations"
}
```

**Response (200)**:
```json
{
  "id": 1,
  "name": "Budi Santoso Updated",
  "email": "budi@siaga.local",
  "role": "requester",
  "department": "Engineering & Operations"
}
```

**Backend Flow**:
1. Validasi input (name wajib)
2. Transaction:
   - UPDATE users (name, department)
   - INSERT audit_logs (UPDATE_PROFILE)
3. Return updated user data

#### 5. POST `/api/profile/change-password`
**Purpose**: Change password user

**Request**:
```json
{
  "oldPassword": "password123",
  "newPassword": "newpassword456",
  "confirmPassword": "newpassword456"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response Error (400)**:
```json
{
  "error": "Old password is incorrect"
}
```

**Backend Flow**:
1. Validasi old password via bcrypt.compare()
2. Validasi new password & confirm match
3. Validasi length >= 6 characters
4. Transaction:
   - Hash new password dengan bcryptjs cost=10
   - UPDATE users.password_hash
   - INSERT audit_logs (CHANGE_PASSWORD)
5. Frontend: logout user (untuk force re-login dengan password baru)

---

### Request Endpoints

#### 6. GET `/api/requests`
**Purpose**: Fetch list requests dengan filtering, sorting, pagination

**Query Parameters**:
```
?status=pending&category=1&sort=newest&page=1&pageSize=10
```

**Response (200)**:
```json
{
  "items": [
    {
      "id": 8,
      "title": "Akses VPN Dev",
      "status": "pending",
      "priority": "medium",
      "category_name": "Perubahan Akses Sistem",
      "requester_name": "Budi Santoso",
      "created_at": "2026-09-23T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

**Filter Logic**:
- **Role-based filtering**:
  - Requester: hanya lihat requests mereka sendiri
  - Approver: lihat requests pending/in_review (bukan IT Support)
  - IT Support: lihat requests pending/in_review kategori IT Support
  - Admin: lihat semua requests

- **Status filter**: Pilih status tertentu atau "all"
- **Category filter**: Pilih kategori atau "all"
- **Sort options**:
  - `newest`: ORDER BY created_at DESC
  - `oldest`: ORDER BY created_at ASC
  - `priority-high`: HIGH priority first, then by date

#### 7. POST `/api/requests`
**Purpose**: Create new request

**Request (FormData)**:
```
category_id: "2"
title: "Akses VPN Dev Environment"
description: "Membutuhkan akses untuk deployment..."
priority: "medium"
leave_date: "2026-09-30" (optional, untuk kategori cuti)
file: <File Object>
```

**Response (201)**:
```json
{
  "id": 8,
  "requester_id": 1,
  "category_id": 2,
  "title": "Akses VPN Dev Environment",
  "status": "pending",
  "current_level": 1,
  "created_at": "2026-09-23T10:00:00Z"
}
```

**Backend Flow** (Transaction):
1. Validasi input (category_id, title, description wajib)
2. Validasi user.role == 'requester'
3. INSERT requests (status='pending', current_level=1)
4. Jika ada file:
   - Mkdir public/uploads jika belum ada
   - Save file dengan naming: `{timestamp}-{filename}`
   - INSERT attachments
5. Query kategori & fetch semua approver L1
6. INSERT notifications ke setiap approver
7. INSERT audit_logs (CREATE_REQUEST)
8. COMMIT transaction

---

### Approval Endpoints

#### 8. POST `/api/requests/{id}/approve`
**Purpose**: Process approval action (approve/reject/revision)

**Request**:
```json
{
  "action": "approved",
  "notes": "Sudah diverifikasi dan setuju"
}
```

Actions: `approved`, `rejected`, `revision_needed`

**Response (200)**:
```json
{
  "success": true,
  "status": "approved"
}
```

**Backend Flow** (Transaction):
1. **Validasi**:
   - User.role must be 'approver'
   - Request status must be 'pending' or 'in_review'
   - Maker-checker: approver_id != requester_id (untuk action='approved')
   - Duplicate check: tidak boleh ada approval dari user ini di level yang sama
   - Notes wajib jika action='rejected' atau 'revision_needed'

2. **INSERT approval_steps**:
   - Record keputusan approver
   - Include timestamp & notes

3. **Update request status**:
   - Jika action='rejected': status='rejected' (END)
   - Jika action='revision_needed': status='revision' (tunggu resubmit)
   - Jika action='approved':
     - Jika current_level < requires_levels:
       - status='in_review', current_level++
       - NOTIFY approver di level berikutnya
     - Else:
       - status='approved' (END)
       - NOTIFY requester (approved)

4. **CREATE notifications** untuk pihak terkait

5. **INSERT audit_logs** (action='APPROVED'/'REJECTED'/etc)

6. **COMMIT** transaction

---

### User Management Endpoints (Admin Only)

#### 9. GET `/api/users`
**Purpose**: Fetch list semua users

**Response (200)**:
```json
[
  {
    "id": 1,
    "name": "Admin User",
    "email": "admin@siaga.local",
    "role": "admin",
    "department": null,
    "is_active": true,
    "created_at": "2026-09-20T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Budi Santoso",
    "email": "budi@siaga.local",
    "role": "requester",
    "department": "Engineering",
    "is_active": true,
    "created_at": "2026-09-21T10:00:00Z"
  }
]
```

#### 10. POST `/api/users`
**Purpose**: Create new user (Admin only)

**Request**:
```json
{
  "name": "Sari Dewi",
  "email": "sari@siaga.local",
  "role": "approver",
  "department": "Management"
}
```

**Response (201)**:
```json
{
  "user": {
    "id": 5,
    "name": "Sari Dewi",
    "email": "sari@siaga.local",
    "role": "approver",
    "department": "Management"
  },
  "temporaryPassword": "aB3dEfGhIjKl",
  "message": "User berhasil dibuat. Password sementara telah ditampilkan di atas."
}
```

**Backend Flow** (Transaction):
1. Validasi input (name, email, role wajib)
2. Cek email tidak sudah exist
3. Generate random password
4. Hash password dengan bcryptjs cost=10
5. INSERT users (is_active=TRUE)
6. INSERT audit_logs (CREATE_USER)
7. COMMIT & return temp password

#### 11. PATCH `/api/users/{id}`
**Purpose**: Activate/Deactivate user

**Request**:
```json
{
  "is_active": false
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "User berhasil dinonaktifkan"
}
```

**Backend Flow** (Transaction):
1. Validasi user tidak bisa deactivate dirinya sendiri
2. UPDATE users.is_active
3. INSERT audit_logs (ACTIVATE_USER/DEACTIVATE_USER)
4. COMMIT

---

### Category Management Endpoints (Admin Only)

#### 12. GET `/api/admin/categories`
**Purpose**: Fetch all categories (active & inactive)

**Response (200)**:
```json
[
  {
    "id": 1,
    "name": "Cuti Karyawan",
    "description": "Pengajuan cuti tahunan atau khusus",
    "requires_levels": 1,
    "is_active": true
  }
]
```

#### 13. POST `/api/admin/categories`
**Purpose**: Create new category

**Request**:
```json
{
  "name": "Training Request",
  "description": "Permintaan training/course untuk karyawan",
  "requires_levels": 2
}
```

**Response (201)**:
```json
{
  "id": 5,
  "name": "Training Request",
  "description": "Permintaan training/course untuk karyawan",
  "requires_levels": 2,
  "is_active": true
}
```

#### 14. PATCH `/api/admin/categories/{id}`
**Purpose**: Activate/Deactivate category

**Request**:
```json
{
  "is_active": false
}
```

---

### Notification Endpoints

#### 15. GET `/api/notifications`
**Purpose**: Fetch unread notifications for current user

**Response (200)**:
```json
[
  {
    "id": 12,
    "recipient_id": 1,
    "request_id": 8,
    "message": "Request #8 telah disetujui oleh approver level 1",
    "is_read": false,
    "created_at": "2026-09-23T15:30:00Z"
  }
]
```

#### 16. PATCH `/api/notifications`
**Purpose**: Mark notification as read

**Request**:
```json
{
  "notificationId": 12,
  "is_read": true
}
```

---

### Audit Trail Endpoints (Admin Only)

#### 17. GET `/api/audit-logs`
**Purpose**: Fetch audit logs dengan filtering

**Query Parameters**:
```
?action=LOGIN&actor=budi&from=2026-09-20&to=2026-09-23
```

**Response (200)**:
```json
[
  {
    "id": 1,
    "actor_id": 1,
    "actor_name": "Budi Santoso",
    "actor_email": "budi@siaga.local",
    "action_type": "LOGIN",
    "target_type": null,
    "target_id": null,
    "description": "User logged in successfully",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2026-09-23T10:00:00Z"
  }
]
```

**Features**:
- Filter by action_type
- Filter by actor name (ILIKE search)
- Filter by date range (from/to)
- Limit 200 records max per query
- Export to CSV via frontend

---

## Komponen Frontend

### 1. Layout Components

#### DashboardLayout (`src/app/dashboard/layout.tsx`)
**Purpose**: Layout wrapper untuk semua dashboard pages

**Key Features**:
- Topbar dengan logo, user info, notifications bell
- Sidebar dengan role-based navigation links
- Mobile hamburger menu
- Notification dropdown dengan unread count
- Logout button

**Role-Based Navigation**:
- **Requester**: My Requests, New Request
- **Approver**: Approval Queue
- **IT Support**: IT Support Queue
- **Admin**: Dashboard, Users, Categories, Audit Trail

**Notification System**:
- Auto-fetch notifikasi setiap 30 detik
- Bell icon menampilkan unread count
- Dropdown list dengan max 20 notifikasi terbaru
- Click notification → navigate ke request detail & mark as read

#### ProfilePage (`src/app/dashboard/profile/page.tsx`)
**Purpose**: User profile management page

**Features**:
- **Profile Info Section**:
  - Display: role, email, department, member since date
  - Edit form: name, department
  - Save button → PATCH /api/profile

- **Change Password Section**:
  - Collapsible form
  - Fields: old password, new password, confirm password
  - Validasi client-side: passwords match, length >= 6
  - Submit → POST /api/profile/change-password

- **Messaging**:
  - Success/error messages dengan color coding
  - Auto-clear after 5 seconds

---

### 2. Request Management Components

#### NewRequestPage (`src/app/dashboard/new/page.tsx`)
**Purpose**: Create new request form

**Features**:
- **Category Dropdown**:
  - Fetch categories dari GET /api/categories
  - Show requires_levels info (1 atau 2 level approval)

- **Conditional Fields**:
  - Jika kategori contains "cuti", show date picker untuk leave_date
  - Min date = tomorrow

- **Form Fields**:
  - Title, Description, Priority (radio buttons)
  - File upload (optional)

- **Validation**:
  - Client-side: required fields
  - Backend: full validation

- **Submit**:
  - FormData upload ke POST /api/requests
  - Navigate ke dashboard on success

#### RequestDetailPage (`src/app/dashboard/requests/{id}/page.tsx`)
**Purpose**: View request detail & perform approval actions

**Features**:
- **Request Info Display**:
  - ID, title, status badge, priority
  - Requester info, department, category
  - Tanggal diajukan
  - Conditional: leave_date jika kategori cuti

- **Attachments**:
  - List semua attachments dengan view/download buttons
  - Image preview (inline)
  - PDF preview (iframe)
  - Fallback untuk file types lain

- **Approval Timeline**:
  - List chronological approval_steps
  - Show: approver name, action (approved/rejected/revision), timestamp, notes

- **Action Panels** (Role-Specific):
  - **Requester (status='revision')**:
    - "Edit & Resubmit" button → /dashboard/requests/{id}/edit
    - "Cancel" button (jika pending/draft) → DELETE endpoint

  - **Approver (pending/in_review)**:
    - Notes textarea (wajib untuk reject/revision)
    - 3 buttons: Approve, Request Revision, Reject
    - Click any → confirmation modal
    - Modal: show request title, confirm action
    - Submit → POST /api/requests/{id}/approve

  - **IT Support (IT Support category, pending/in_review)**:
    - Notes textarea (wajib) untuk resolution
    - File upload (bukti resolusi)
    - "Tandai Beres" button → POST /api/requests/{id}/support-resolve

#### DashboardPage (`src/app/dashboard/page.tsx`)
**Purpose**: Main dashboard dengan stats, charts, request list

**Features**:
- **Stat Cards** (5 columns):
  - Total Request, Pending, Approved, Rejected, Approval Rate

- **Charts**:
  - Chart 1 (Request per Kategori): horizontal bar chart
  - Chart 2 (Tren 7 Hari): vertical bar chart
  - Pure CSS implementation (no external chart library)

- **Request Table dengan Filter/Sort/Pagination**:
  - **Filter Controls** (4 columns):
    1. Status filter (dropdown)
    2. Category filter (dropdown)
    3. Sort options (newest/oldest/priority)
    4. Page size (10/25/50)

  - **Table**:
    - Columns: ID, Judul, Status, Prioritas, Tanggal
    - Click row → detail page
    - Status badges dengan color coding

  - **Pagination**:
    - Show: "Menampilkan 1-10 dari 42 request"
    - Previous/Next buttons
    - Disabled at boundaries
    - Current page indicator

**Role-Specific Display**:
- **Title**: My Requests (requester) / Approval Queue (approver) / etc
- **Filter Logic**: Role-based filtering applied server-side
- **Data**: Stats show role-filtered data

---

### 3. Admin Components

#### UsersPage (`src/app/dashboard/users/page.tsx`)
**Purpose**: User management admin panel

**Features**:
- **Create User Form** (collapsible):
  - Fields: Name, Email, Role (dropdown), Department
  - Submit → POST /api/users
  - Success: show temp password dengan copy button

- **User List Table**:
  - Columns: Nama, Email, Role, Departemen, Status, Aksi
  - Status badge: Aktif (green) / Nonaktif (red)
  - Aksi: Toggle button "Nonaktifkan"/"Aktifkan" → PATCH /api/users/{id}

- **Confirmation Dialog**: Sebelum deactivate user

#### CategoriesPage (`src/app/dashboard/categories/page.tsx`)
**Purpose**: Category management admin panel

**Features**:
- **Create Category Form** (collapsible):
  - Fields: Nama, Deskripsi, Requires Levels (radio 1 atau 2)
  - Submit → POST /api/admin/categories

- **Category List Table**:
  - Columns: Nama, Deskripsi, Level Approval, Status, Aksi
  - Status badge: Aktif / Nonaktif
  - Aksi: Toggle "Nonaktifkan"/"Aktifkan" → PATCH /api/admin/categories/{id}

#### AuditTrailPage (`src/app/dashboard/audit/page.tsx`)
**Purpose**: Audit log viewer & exporter

**Features**:
- **Filter Controls** (5 columns):
  1. Actor search (text input, ILIKE)
  2. Action type (dropdown)
  3. From date (date input)
  4. To date (date input)
  5. Filter button

- **Audit Log Table**:
  - Columns: Waktu, Aktor, Aksi, Target, IP, Deskripsi
  - Read-only (no edit/delete)
  - Monospace font untuk IP address

- **CSV Export**:
  - Client-side CSV generation
  - Filename: audit-trail-{date}.csv
  - Download via browser

- **Pagination**:
  - Hardcoded LIMIT 200 (backend)
  - Show: "Menampilkan X dari Y entri"

---

## Fitur Keamanan

### 1. Authentication & Authorization

#### JWT Token
- **Payload**: `{ id, role, name }`
- **Expiry**: 8 hours
- **Signing**: HMAC-SHA256
- **Header**: `Authorization: Bearer <token>`

**Flow**:
```
Client Login → Server validate email/password → Generate JWT
              → Store JWT in localStorage
              → Send JWT in every request header
              → Server verify JWT & extract user
              → Check role & permissions
```

#### Role-Based Access Control (RBAC)
```
User Roles:
├─ requester: Bisa submit request, view own requests, edit profil
├─ approver: Bisa approve/reject requests (bukan IT Support)
├─ it_support: Bisa resolve IT Support tickets
└─ admin: Bisa manage users, categories, audit logs

Endpoints Protection:
├─ Public: POST /api/auth/login
├─ Authenticated: GET /api/profile, PATCH /api/profile
├─ Requester: POST /api/requests, GET /api/requests (own)
├─ Approver: POST /api/requests/{id}/approve
├─ IT Support: POST /api/requests/{id}/support-resolve
└─ Admin: GET/POST/PATCH /api/users, /api/admin/categories, /api/audit-logs
```

### 2. Data Protection

#### Password Hashing
- **Algorithm**: bcryptjs
- **Cost Factor**: 10 (balance antara security & performance)
- **Workflow**:
  ```
  User input: "password123"
           ↓
  bcryptjs.hash(password, 10)
           ↓
  Stored: $2b$10$... (60 chars)
           ↓
  Login: bcryptjs.compare(inputPassword, storedHash)
  ```

#### SQL Injection Prevention
- **Method**: Parameterized Queries (Prepared Statements)
- **Implementation**: All queries use `$1, $2, ...` placeholders
- **Example**:
  ```typescript
  // SAFE ✅
  await query('SELECT * FROM users WHERE email = $1', [email])
  
  // UNSAFE ❌
  await query(`SELECT * FROM users WHERE email = '${email}'`)
  ```

#### Transaction Safety
- **Dedicated Client Connection**: Setiap transaction pakai dedicated client (bukan shared pool)
- **ACID Compliance**: BEGIN → operations → COMMIT/ROLLBACK
- **Example**:
  ```typescript
  const client = await getClient()
  try {
    await client.query('BEGIN')
    // Multiple operations
    await client.query('COMMIT')
  } catch {
    await client.query('ROLLBACK')
  } finally {
    client.release()
  }
  ```

### 3. Business Logic Security

#### Maker-Checker Principle
- **Rule**: Requester tidak bisa approve request mereka sendiri
- **Implementation**: Backend validation (bukan hanya UI)
  ```typescript
  if (reqData.requester_id === user.id && action === 'approved') {
    return NextResponse.json({ error: 'Maker-checker violation' }, { status: 403 })
  }
  ```

#### Duplicate Approval Prevention
- **Rule**: Approver tidak bisa approve request 2x di level yang sama
- **Check**:
  ```typescript
  const existing = await client.query(
    'SELECT * FROM approval_steps WHERE request_id=$1 AND approver_id=$2 AND level=$3',
    [id, user.id, level]
  )
  if (existing.rowCount > 0) {
    throw new Error('Already approved at this level')
  }
  ```

### 4. Audit Trail (Immutable Logging)

#### Immutability Enforcement
- **No UPDATE/DELETE**: Database constraints mencegah modifikasi audit_logs
- **Context Captured**: IP address, user-agent, action type, timestamp
- **Full Coverage**: Setiap aksi penting ter-log:
  - LOGIN/LOGOUT
  - CREATE/UPDATE/DELETE request
  - APPROVE/REJECT/REVISION
  - CREATE/UPDATE/DELETE user
  - CHANGE_PASSWORD
  - UPDATE_PROFILE

#### Compliance Benefits
- **Accountability**: Siapa melakukan apa, kapan, dari mana
- **Forensics**: Trace setiap aksi untuk investigasi
- **Regulatory**: Memenuhi requirement audit internal dan inspeksi

---

## Panduan Setup

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
   # Create .env file
   cat > .env << EOF
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/siaga
   JWT_SECRET=your-secret-key-here-min-32-chars
   EOF
   ```

4. **Create Database**
   ```bash
   # Login to PostgreSQL
   psql -U postgres
   
   # Create database
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

### Demo Credentials

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

## Troubleshooting

### Common Issues & Solutions

#### 1. Database Connection Error
**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
- Pastikan PostgreSQL service running
- Validasi DATABASE_URL di .env
- Check credentials (username, password, database name)

#### 2. File Upload Not Working
**Error**: `ENOENT: no such file or directory 'public/uploads/...`

**Solution**:
- Pastikan direktori `public/uploads/` exist
- Run: `mkdir -p public/uploads`
- Check file permissions

#### 3. JWT Token Expired
**Error**: `Unauthorized - token expired`

**Solution**:
- Token expire after 8 hours
- User perlu login ulang
- Frontend auto-redirect ke login page

#### 4. Lint Errors
**Run**:
```bash
npm run lint
```

**Common**:
- Unused variables: delete atau prefix dengan `_`
- Missing dependency: add to useEffect array (dengan comment jika intentional)

#### 5. Build Failed
**Error**: TypeScript errors or bundle issues

**Solution**:
```bash
# Clean & rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

## Conclusion

SIAGA adalah aplikasi production-ready yang mendemonstrasikan best practices dalam:
- **Backend**: Transaction safety, parameterized queries, audit logging
- **Frontend**: React hooks, form handling, responsive design
- **Security**: JWT auth, RBAC, password hashing, immutable logs
- **Business Logic**: Maker-checker, multi-level approval, compliance

Aplikasi ini siap untuk di-deploy dan digunakan di environment perbankan atau organisasi besar lainnya yang memerlukan sistem approval & ticketing yang robust dan compliant.

---

**Repository**: https://github.com/BerlinNapoleon/SIAGA  
**License**: Proprietary - CIMB IT Graduate Programme  
**Contact**: dev@siaga.local
