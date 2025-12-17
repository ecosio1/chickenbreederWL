# QA Checklist (V1) — Poultry Breeder Portal

This checklist covers **repeatable smoke tests** and **automated test coverage** for critical V1 flows.

## Prereqs (local)
- Node.js 20+ recommended
- PostgreSQL (for full end-to-end), or run API tests only (no DB needed)

### Install
```bash
npm install
```

### Env
- Copy `env.example` → `.env` and set `DATABASE_URL` (Postgres)

### DB (optional for UI/manual QA)
```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

### Run app
```bash
npm run dev
```

## Automated tests (CI / local)
```bash
npm test
```

Covered by tests:
- Chicken CRUD/search/status logic
- Breeding event creation + real-time pair-risk warnings
- Offspring batch creation + parent linking + breed defaults
- Lineage expansion + lineage tree rendering
- Org scoping + cross-tenant denial
- CSV import counts + parent linking by unique_code

## Manual smoke tests (10–15 min)

### 1) Create chicken → list → search → edit → status change
- Go to `Chickens`
- Create a chicken (Visual ID + breed + sex)
- Confirm it appears in list
- Search by **unique_code** and **visual_id_number**
- Edit a field (e.g., coop/location)
- Change status to `sold` or `deceased`
- Confirm status change persists and status date is set

### 2) Create breeding event → inbreeding warnings → save
- Go to `Breeding`
- Create event
- Pick sire/dam via searchable picker
- Confirm warnings panel updates as you change the pair
- Save and confirm it appears in the list and detail page

### 3) Add offspring batch → verify parent links → verify breed defaults
- Open a Breeding Event detail page
- Click `Add offspring`
- Create N offspring
- Confirm offspring appear on:
  - Breeding event detail page (offspring list)
  - Both parent chicken detail pages (offspring list)
- Verify breed defaults:
  - Same pure breed parents → offspring uses same `breed_primary` with no secondary
  - Mixed case → offspring uses `sire.breed_primary` + `dam.breed_primary`

### 4) Lineage tree renders correct parents/grandparents
- Open a chicken detail page with parents/grandparents set
- Confirm parents + grandparents cards show correct unique codes and link correctly

### 5) Org scoping prevents cross-tenant access
- (Requires multi-org setup) Confirm you can’t access another org’s chicken by direct URL or API call

### 6) Import CSV → verify counts → verify parent linking
- Download template: `GET /api/import/chickens/template.csv`
- Fill with a small set of rows (including parent codes + child rows referencing them)
- Run import in UI (or via API if testing directly)
- Confirm:
  - created/updated/failed counts are accurate
  - parent links are created when `sire_unique_code` / `dam_unique_code` resolve


