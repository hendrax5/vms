# DCIM ENTERPRISE BUILD PACK

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### Overview
DCIM system for multi-datacenter operations with QR-based workflows for visitor and goods tracking.

### Core Features
- Multi-location (datacenter-aware)
- Inventory lifecycle management
- Rack visualization (42U/48U)
- Cross connect tracking
- Visitor QR check-in/out
- Goods QR tracking
- Audit logs
- Role-based access

---

## 2. DATABASE SCHEMA (PostgreSQL)

### datacenters
- id (PK)
- name
- location
- created_at

### racks
- id (PK)
- datacenter_id (FK)
- name
- total_u

### rack_units
- id (PK)
- rack_id (FK)
- position
- asset_id (FK)

### assets
- id (PK)
- asset_code
- type
- brand
- model
- serial
- datacenter_id
- rack_position
- status

### visitors
- id (PK)
- name
- company
- purpose
- datacenter_id
- qr_token
- valid_from
- valid_until
- status

### goods
- id (PK)
- name
- owner
- serial
- datacenter_id
- qr_token
- status

### cross_connects
- id (PK)
- from_location
- to_location
- type
- status
- datacenter_id

### audit_logs
- id (PK)
- action
- user_id
- datacenter_id
- timestamp

---

## 3. API SPEC (SIMPLIFIED)

### Assets
GET /assets  
POST /assets  

### Racks
GET /racks  
POST /racks  

### Visitors
POST /visitor/request  
GET /visitors  

### Goods
POST /goods/in  

### QR Scan
POST /scan/qr  
Request:
{
  "token": "string"
}

---

## 4. UI PROMPT (AI GENERATION)

Create a modern DCIM dashboard with:
- Dark theme
- Sidebar navigation
- Topbar with datacenter selector
- Pages:
  - Dashboard (KPI cards + charts)
  - Rack view (42U vertical grid)
  - Inventory table
  - Cross connect graph
  - Visitor QR system
  - Mobile QR scanner

Style:
- Minimal
- Clean
- Tailwind CSS
- Inspired by AWS / Vercel

---

## 5. PROJECT STRUCTURE

/backend
/frontend
/docs
/api
/db

---

## 6. NOTES

This file is AI-ready:
- Use for backend generation
- Use for frontend generation
- Extend with OpenAPI if needed
