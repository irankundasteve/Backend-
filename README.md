# Minimal Image Management System

A small full-stack JavaScript project with:

- **Image uploads** (backend upload + frontend display)
- **Category management** (create + rename categories)
- **Image editing** (text overlays)
- **Dedicated admin panel** for managing images and categories
- **Public gallery** for viewing uploaded images

## Run locally

```bash
npm install
npm start
```

Open:

- `http://localhost:3000/` for the public gallery
- `http://localhost:3000/admin` (or `/admin.html`) for the admin panel

## API overview

- `GET /api/health`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `GET /api/images`
- `POST /api/images` (multipart key: `image`)
- `PUT /api/images/:id/edit`

Data is persisted in `data/store.json`, and image files are stored in `uploads/`.
