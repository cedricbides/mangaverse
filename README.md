# MangaVerse — Full-Stack Manga Site (MERN)

A complete manga reading platform with MangaDex integration, admin panel, user profiles, and local manga management.

## 🚀 New Features Added

### 📚 Catalog Page (`/catalog`)
- Browse all manga from MangaDex API with full pagination
- Genre pills, status filters, sort options (Popular / Latest / Newest / A–Z)
- Toggle between Grid and List view
- Separate "Site Exclusives" tab showing admin-added manga

### 👤 User Side
- **Login Page** (`/login`) — Email/password + Google OAuth
- **Profile Page** (`/profile`) — Favorites grid, reading history
- First account registered automatically becomes Admin

### 🛡️ Admin Dashboard (`/admin`)
- **Stats** — User count, manga count, chapter count
- **Manga Management** — Add / edit / delete local manga with cover URL, genres, status, author
- **Chapter Management** — Add chapters with page image URLs (one per line), preview thumbnails
- **User Management** — View all users, promote/demote admin role

## 🗂️ Project Structure

```
mangasite/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.ts          # + role, password fields
│   │   │   ├── LocalManga.ts    # NEW: Admin-managed manga
│   │   │   └── LocalChapter.ts  # NEW: Admin-managed chapters
│   │   ├── routes/
│   │   │   ├── auth.ts          # + email/password login
│   │   │   ├── admin.ts         # NEW: Admin CRUD routes
│   │   │   ├── localManga.ts    # NEW: Public local manga routes
│   │   │   └── favorites.ts
│   │   ├── middleware/
│   │   │   └── auth.ts          # NEW: requireAuth, requireAdmin
│   │   └── server.ts
└── frontend/
    └── src/
        ├── pages/
        │   ├── Catalog.tsx      # NEW: Full catalog with filters
        │   ├── Profile.tsx      # NEW: User profile + history
        │   ├── Login.tsx        # NEW: Email/password login
        │   ├── Admin.tsx        # NEW: Admin dashboard
        │   ├── LocalMangaDetail.tsx  # NEW: Local manga detail
        │   └── LocalReader.tsx  # NEW: Reader for local chapters
        ├── context/
        │   └── AuthContext.tsx  # + isAdmin, loginWithEmail, register
        └── types/index.ts       # + LocalManga, LocalChapter, role
```

## ⚙️ Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your MongoDB URI and Session Secret
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Admin Access

1. Go to `/login` and register an account
2. The **first registered account** automatically becomes Admin
3. Admin badge appears in the navbar
4. Access `/admin` for the dashboard

Or manually set `role: "admin"` in MongoDB for a user document.

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Register with email/password
- `POST /api/auth/login` — Login with email/password  
- `GET /auth/google` — Google OAuth
- `GET /api/auth/me` — Current user
- `GET /api/auth/logout` — Logout

### Admin (requires admin role)
- `GET /api/admin/stats`
- `GET/POST /api/admin/manga`
- `PUT/DELETE /api/admin/manga/:id`
- `GET/POST /api/admin/manga/:id/chapters`
- `PUT/DELETE /api/admin/chapters/:id`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id/role`

### Local Manga (public)
- `GET /api/local-manga` — All local manga
- `GET /api/local-manga/:id` — Single manga by ID or slug
- `GET /api/local-manga/:id/chapters` — Chapters for a manga
- `GET /api/local-manga/chapter/:id` — Single chapter

## 🎨 Adding Your First Manga (Admin Workflow)

1. Login as admin → click **Admin** in navbar
2. Click **Add Manga** → fill title, cover URL, description, genres
3. After saving, expand the manga row → click **+ Chapter**
4. Enter chapter number, then paste image URLs (one per line)
5. The manga appears in Catalog → Site Exclusives tab
