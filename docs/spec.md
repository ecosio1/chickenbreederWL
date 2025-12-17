# Poultry Breeder Portal (SaaS, org-based) — V1 Spec

This document defines **ONLY V1 scope** user workflows and UI screens for “Poultry Breeder Portal”.

## V1 principles / constraints
- **Org-based multi-tenant**: every record belongs to an organization; users can switch org context.
- **Simple lineage**: parents + grandparents only; **no advanced genetic predictions/probabilities**.
- **Core operations first**: create/edit/view chickens, track status and location, record breeding + offspring, show lineage, and flag risky pairings.

## Entities (V1 data model)

### Organization
- **id**
- **name** (required)
- **createdAt**

### Membership (optional for V1 invites)
- **orgId**
- **userEmail**
- **role** (V1: `owner` | `member`)
- **status** (V1: `invited` | `active`)

### Chicken
- **id**
- **orgId**
- **name** (optional)
- **visualId** (required): a human-readable ID to match physical bands/zip ties
- **sex** (V1: `male` | `female` | `unknown`)
- **breed** (optional free text)
- **hatchDate** (optional)
- **status** (required): `alive` | `sold` | `deceased`
- **statusChangedAt** (required)
- **currentLocation** (required): { **coopName** (optional), **areaName** (optional), **notes** (optional) }
- **notes** (optional)
- **parents** (optional): { **sireId** (optional), **damId** (optional) }

### BreedingRecord
- **id**
- **orgId**
- **sireId** (required, must reference a Chicken)
- **damId** (required, must reference a Chicken)
- **pairingDates** (required): list of dates (supports 1+ dates for repeated pairings)
- **notes** (optional)

## V1 user workflows & UI screens

### 1) Organization setup

#### Screen: Create Organization
- **Purpose**: first-time onboarding; create an org to store data under.
- **Primary actions**
  - Create organization
- **Data captured**
  - Organization name (required)
- **Rules**
  - User becomes org `owner`.
  - After creation, user enters the org context automatically.

#### Screen: Organization Switcher
- **Purpose**: switch current org context (multi-org users).
- **Primary actions**
  - View org list
  - Switch current org
- **Data captured**
  - None (selection only)

#### Screen: Invite Members (optional for V1)
- **Purpose**: invite others to the org (can be “coming soon” in UI but defined here).
- **Primary actions**
  - Invite by email
  - View pending invites
  - (Optional V1) revoke invite
- **Data captured**
  - Email (required)
  - Role (default `member`)
- **Rules**
  - If invites are not implemented in code for V1, the screen may be present but disabled with clear copy.

---

### 2) Chicken management

#### Screen: Chickens List (Search + Filters)
- **Purpose**: browse, search, and quickly access a chicken record.
- **Primary actions**
  - Search chickens (by **Visual ID**, name)
  - Filter by status (`alive`, `sold`, `deceased`)
  - Open chicken details
  - Create new chicken
- **Data displayed**
  - Visual ID (prominent)
  - Name (if any)
  - Sex, status
  - Current location (coop/area)
  - Quick parent indicators (optional: “has sire/dam”)

#### Screen: Create Chicken
- **Purpose**: add a new chicken to the org.
- **Primary actions**
  - Save (create)
  - Cancel
- **Data captured**
  - Visual ID (required, unique within org recommended)
  - Name (optional)
  - Sex (optional)
  - Breed (optional)
  - Hatch date (optional)
  - Status (default `alive`)
  - Current location (coop/area/notes)
  - Notes (optional)
  - Parents (optional): sire + dam selection (if known)
- **Rules**
  - If parents are selected, the UI should prevent obvious invalid choices (e.g., selecting the same chicken as its own parent).

#### Screen: Chicken Details (View)
- **Purpose**: single source of truth for a chicken; launch edits, status updates, and lineage.
- **Primary actions**
  - Edit chicken
  - Change status (alive/sold/deceased)
  - Move location (coop/area)
  - View lineage (parents + grandparents)
  - (Optional V1) view related breeding records/offspring
- **Data displayed**
  - Visual ID (primary label)
  - Name, sex, breed, hatch date
  - Status + date changed
  - Current location
  - Parent links (sire, dam)

#### Screen: Edit Chicken
- **Purpose**: update fields over time.
- **Primary actions**
  - Save changes
  - Cancel
- **Data captured**
  - Same fields as Create Chicken
- **Rules**
  - Visual ID edits should be allowed but validated for collisions within org.

#### Screen: Change Status (modal or subpage)
- **Purpose**: record lifecycle changes.
- **Primary actions**
  - Set status: `alive` / `sold` / `deceased`
  - Save
- **Data captured**
  - New status
  - Effective date/time (default “now”, editable)
  - Notes (optional; e.g., cause of death, buyer info)

#### Screen: Move Location (modal or subpage)
- **Purpose**: track where the bird is housed.
- **Primary actions**
  - Update location
  - Save
- **Data captured**
  - Coop name (optional)
  - Area name (optional)
  - Notes (optional)

---

### 3) Visual Identifier system

#### UX requirement (cross-cutting)
- Every chicken has a **Visual ID** field that matches real-world bands/zip ties.
- **Visual ID must be highly visible** in list rows, detail headers, and search inputs.
- Search should prioritize **exact Visual ID matches** and support partial matches.

---

### 4) Breeding + offspring creation

#### Screen: Record Breeding Pair
- **Purpose**: create a breeding record for a sire/dam pairing.
- **Primary actions**
  - Select sire (male) and dam (female)
  - Add one or more pairing dates
  - Save breeding record
- **Data captured**
  - Sire (required)
  - Dam (required)
  - Pairing date(s) (required; supports multiple)
  - Notes (optional)
- **Rules**
  - When selecting sire/dam, show **inbreeding warnings** (see section 6) before save.
  - V1 does not attempt fertility/egg math; it only records the pairing.

#### Screen: Create Offspring (from a Breeding Record)
- **Purpose**: add chicks linked to parents (sire + dam).
- **Primary actions**
  - Create one offspring, or create many in a batch
  - Save offspring records
- **Data captured (per offspring)**
  - Visual ID (required)
  - Hatch date (optional; can be prefilled from context)
  - Sex (optional; default unknown)
  - Status (default alive)
  - Current location (optional prefill)
  - Notes (optional)
- **Rules**
  - Offspring records must store **parent references** to the sire/dam from the breeding record.

---

### 5) Lineage (parents + grandparents)

#### Screen: Lineage View (for a Chicken)
- **Purpose**: quickly see ancestry links.
- **Primary actions**
  - Navigate to parent chicken details (sire/dam)
  - Navigate to grandparent chicken details (if present)
- **Data displayed**
  - Current chicken (Visual ID + name)
  - Parents:
    - Sire (if known)
    - Dam (if known)
  - Grandparents:
    - Sire’s sire + sire’s dam (if known)
    - Dam’s sire + dam’s dam (if known)
- **Tree requirement**
  - A simple 2-level tree: **parents + grandparents only**.

---

### 6) Inbreeding warnings (pair selection)

Warnings are displayed **during sire/dam selection** (and re-checked on save). V1 flags risk but does not block unless desired by product policy.

#### Screen behavior: Pairing Risk Panel (inline)
- **Where it appears**: Record Breeding Pair screen (and optionally anywhere sire/dam are chosen).
- **Primary actions**
  - Review warnings
  - Continue / adjust pair selection

#### Risk rules (V1)
- **Full siblings**: sire and dam share the same parent(s).
  - Minimum rule: **same sire OR same dam** → flag “shared parent”.
  - Stronger message if **both** sire and dam match (if both parents known).
- **Parent/child pairing**: one selected chicken is a parent of the other.
  - If sireId/damId of one equals the other’s id → flag.
- **Shared grandparent(s)**: the two chickens have at least one grandparent in common.
  - Compute grandparents for each (via their parents), then intersect.

#### UX copy requirement (example)
- “Risk: These birds share a parent (possible full/half siblings).”
- “High risk: One bird is the parent of the other.”
- “Risk: These birds share a grandparent.”

## Explicit non-goals (out of V1)
- Any genetic prediction, probability, coefficient calculations, trait inference, or advanced pedigree analytics.
- Hatch rate tracking, egg production, incubation scheduling, sales invoicing, health/vet modules, and inventory.


