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