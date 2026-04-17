# PRODC VMS - Design & Architectural Priciples
*This document maintains the architectural guidelines and user UI/UX preferences discovered during active development to guide future AI agents.*

## 1. UI & Visual Aesthetics
- **Premium & Uncluttered:** End users abhor deeply nested interfaces (like endless vertical accordions) that waste space. The design should always feel "clean" and "tidak rame".
- **Glassmorphism & Gradients:** Favor clean `bg-neutral-900 border border-neutral-800` styling mixed with subtle glowing gradients (e.g., `bg-gradient-to-r from-neutral-900 to-indigo-900/10`).
- **Icons & Motion:** Exclusively use `lucide-react` for iconography. Ensure smooth UI transitions via `framer-motion` (`AnimatePresence`, `motion.div`).

## 2. Component Design Patterns
- **Horizontal Tabs over Vertical Accordions:** Break down deep tree hierarchies (Datacenter -> Room) globally by pushing children items into Horizontal Scrolling Menu Tabs.
- **Visual Spatial Grids (Tiles):** Standard hardware mappings (Servers, Racks) must be modeled using Flexbox/CSS Grid to visually simulate physical floor-plans, rather than listing them dynamically in a plain HTML table.
- **Ghost/Hover Actions:** Banish generic 'action dropdown toggles' (.e.g, clicking Three-Dots to open Edit/Delete). Instead, employ `group-hover:opacity-100` context menus. Action buttons (Pencil/Trash) should gracefully fade onto the screen only when the user's mouse floats over the target entity.
- **Intelligent Modals:** Deeply nested create/edit forms should never be full-page redirects. Use Centered Modals (`fixed inset-0`). For Editing, the form logic MUST feature 'Deep Path Parsing' (automatically reverse engineering nested IDs to pre-fill dropdown cascades).

## 3. Backend & Security Architecture
- **Defensive Anti-Collision:** Data integrity maps (like Port Allocations and Cross-Connect Fiber maps) must contain aggressive backend validation protecting against 409 Conflicts. Never allow a logical port overwrite.
- **Hybrid RBAC + ACL Core:** The system security uses a combined permissions matrix. The `NextAuth` module automatically parses broad System Roles AND explicitly allowed fine-grained overrides stored in the Prisma `UserPermission` map.

## 4. Stack Specification
- Format: Next.js 16 (App Router)
- ORM: Prisma (PostgreSQL)
- Styles: Vanilla Tailwind CSS (No extra UI frameworks like Shadcn/MUI unless requested).
