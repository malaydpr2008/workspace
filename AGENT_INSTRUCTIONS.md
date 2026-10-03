# Engineering Directive: Modular Workspace Engine

## System Overview
You are building an extensible, block-based workspace application using Django REST Framework (DRF), PostgreSQL, and Next.js (App Router, Tailwind CSS, TypeScript). 

## Non-Negotiable Invariants
1. **Universal Composite Pattern (Single Node Hierarchy):**
   - Every workspace entity (folders, screenplays, stories, articles, scenes, chapters, dialogues, actions) is stored in the `workspace_nodes` table.
   - Do NOT create separate tables for `Story`, `Screenplay`, `Article`, or `Scene`.
   - Structural differences are dictated by `type`, `properties` (PostgreSQL JSONB), and parent-child foreign keys.
2. **Deterministic $O(1)$ Reordering:**
   - Order is dictated by a string/LexoRank field (`rank`). Reordering or dragging updates only the shifted record without re-indexing adjacent siblings.
3. **Decoupled Production Layer (Shots & Storyboards):**
   - Shots are NEVER parent containers of narrative text. Scripts flow linearly: `Scene` -> `Action` / `Dialogue`.
   - `Shot` records reference covered text blocks through the `shot_block_coverage` junction table (`shot_id`, `block_id`, `order_index`).
4. **Independent Entity Registry:**
   - Entities like `Character` and `Location` reside in dedicated workspace registry tables. Text blocks point to entities via `properties.character_id`.
5. **Polymorphic UI Dispatch:**
   - The Next.js frontend resolves and renders nodes through dynamic component dispatchers based on `node.type`.
6. **Workspace Multi-Tenancy:**
   - Every node, character, and shot must maintain a direct foreign key to `workspace_id`. Queries must always filter by workspace scope first.

## Environment & Orchestration Rules

### 1. Daily Development Workflow (Default)
Do **NOT** boot `docker-compose.prod.yml` during regular development or testing sessions.

Use either of the following two development flows:

- **Option A: Containerized Dev Stack (Hot-Reloading Enabled)**:
  ```powershell
  # Start the lean 3-service dev stack (db, backend, frontend with live code volumes)
  docker compose -f docker-compose.dev.yml up -d
  # (or standard 'docker compose up -d')
  ```
  - `db`: PostgreSQL 16 (port 5432:5432).
  - `backend`: Auto-reloading Django Daphne dev server (`./backend:/app` host volume, port 8000:8000, uses `InMemoryChannelLayer`).
  - `frontend`: Turbopack Next.js dev server (`./frontend:/app` host volume, port 3000:3000, anonymous volumes for node_modules and .next).
  - `gateway` and `redis` are excluded from the daily dev stack to minimize resource overhead.

- **Option B: Hybrid Native Host Dev (Fastest)**:
  ```powershell
  # 1. Start only the PostgreSQL database container
  docker compose up -d db

  # 2. Terminal 1 (Backend):
  cd backend
  .\venv\Scripts\Activate.ps1
  python manage.py runserver 127.0.0.1:8000

  # 3. Terminal 2 (Frontend):
  cd frontend
  npm run dev
  ```

### 2. Production Stack (Staging / Release Only)
`docker-compose.prod.yml` should **ONLY** be used when validating full production containerization, Nginx gateway routing, or multi-worker Redis scaling:
```powershell
docker compose -f docker-compose.prod.yml up --build -d
```
Always tear it down before resuming daily development:
```powershell
docker compose -f docker-compose.prod.yml down
```