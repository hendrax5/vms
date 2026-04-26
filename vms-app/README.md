# PRODC VMS - Premium Data Center Infrastructure & Visitor Management System

PRODC VMS is an enterprise-grade, multi-datacenter Data Center Infrastructure Management (DCIM) and Visitor Management System. Built with high-end UI/UX standards, it streamlines the tracking of physical assets, cross-connects, and operational workflows using modern QR-based operations.

## 🚀 Core Features

- **Multi-Datacenter Awareness**: Manage multiple sites, rooms, rows, and datacenters from a centralized hub.
- **Visual Spatial Grids**: Interactive physical floor-plan mapping for racks (42U/48U) and hardware positioning instead of basic tables.
- **Inventory Lifecycle Management**: Granular tracking for assets, server models, and serial numbers.
- **Visitor & Goods Tracking**: Automated Check-In/Check-Out via dynamically generated QR codes and mobile-responsive Kiosk scanner modes.
- **Cross Connect Mapping**: Deep tracking of fiber and cable cross-connects with anti-collision defensive validation.
- **Intelligent RBAC + ACL**: Deeply granular security mesh combining global user roles with fine-grained endpoint permissions.
- **Comprehensive Audit Trails**: Immutable audit logs capturing every user interaction.

## 💻 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS (Premium glassmorphism, dark themes, and pure vanilla CSS implementation).
- **Icons & Animation**: `lucide-react` and `framer-motion`
- **Analytics & Tracking**: OpenTelemetry (OTel) instrumentation.

## 🛠 Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
# or
yarn install
```

2. Configure your environment variables in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vms_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
# Add any required SMTP/Mail configurations here
```

3. Initialize the database and run seeds:
```bash
npx prisma generate
npx prisma db push
npm run db:seed:permissions
```

4. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🎨 UI/UX Design Principles

This application strictly adheres to the PRODC VMS Design Standards:
- **Clean & Uncluttered**: Deep vertical accordions are replaced by fluid horizontal tabs.
- **Minimal Action Clutter**: Uses "Ghost" context actions (hover-only visibility) to prevent UI overload.
- **Premium Aesthetics**: Adopts a sleek dark mode with subtle glowing gradients (`bg-neutral-900 border-neutral-800`).
- **Intelligent Modals**: Edit/Create forms use centered overlay modals to avoid full page reloads, featuring automatic deep-path parsing for rapid cascading selections.

## 📦 Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Analyzes the codebase using ESLint.
- `npm run db:seed:permissions`: Seeds the initial RBAC configuration and default Superadmins.
- `npm run migrate:excel` / `migrate:crossconnect`: Utility scripts for importing legacy infrastructure data.

## 📚 Documentation
- [DCIM Build Pack](./DCIM_BUILD_PACK.md) - Detailed Database Schema and PRD.
- [VMS Design Standards](./VMS_DESIGN_STANDARDS.md) - Architectural and UI Guidelines.

---
*Built with ❤️ for modern Datacenter Operations.*
