# NexusCare Workflow — LAN Deployment Guide

## 🚀 Quick Start (Development — Local Machine)

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Clone and Setup Backend
```bash
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
Backend runs at: **http://localhost:4000**

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: **http://localhost:3000**

### 3. Login
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nexuscare.local | admin123 |
| Doctor | doctor@nexuscare.local | doctor123 |

---

## 🌐 LAN Access (Multiple Devices)

Both servers already bind to `0.0.0.0`. To access from any device on your Wi-Fi:

1. Find your host machine's LAN IP:
   ```powershell
   # Windows
   ipconfig
   # Look for IPv4 Address, e.g.: 192.168.1.15
   ```

2. On any phone, tablet, or PC on the same network open:
   - **App:** `http://192.168.1.15:3000`
   - **Patient Portal:** `http://192.168.1.15:3000/patient/Q-001`

3. **Firewall:** Allow inbound on ports `3000` and `4000`:
   ```powershell
   netsh advfirewall firewall add rule name="NexusCare Frontend" dir=in action=allow protocol=TCP localport=3000
   netsh advfirewall firewall add rule name="NexusCare Backend" dir=in action=allow protocol=TCP localport=4000
   ```

---

## 🐳 Production Deployment (Docker + NGINX)

### Prerequisites
- Docker Desktop or Docker Engine

### Steps
```bash
# Set your LAN IP
export HOST_IP=192.168.1.15   # Windows: set HOST_IP=192.168.1.15

# Build and launch all services
docker compose up --build -d

# Check logs
docker compose logs -f

# Stop services
docker compose down
```

Access everything on: **http://192.168.1.15** (port 80 via NGINX)

---

## 📁 Project Structure
```
valencia_nexuscare/
├── frontend/          # Next.js App (port 3000)
├── backend/           # Express + Socket.IO (port 4000)
│   ├── src/
│   │   ├── routes/    # REST API endpoints
│   │   ├── middleware/ # JWT auth + RBAC
│   │   └── prisma.ts  # DB client
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` in the backend directory:

```
DATABASE_URL=file:./dev.db
JWT_SECRET=your_secret_here
PORT=4000
```

---

## 🏥 System Modules

| Module | URL | Roles |
|--------|-----|-------|
| Login | `/` | All |
| Queue Triage | `/dashboard` | Admin, Doctor, Nurse |
| Doctor Panel | `/dashboard/doctor` | Admin, Doctor |
| Nurse Station | `/dashboard/nurse` | Admin, Nurse |
| Lab Queue | `/dashboard/lab` | Admin, Lab Staff |
| Room Tracking | `/dashboard/rooms` | Admin, Nurse, Cleaning |
| Analytics | `/dashboard/analytics` | Admin |
| Heatmap | `/dashboard/heatmap` | Admin, Doctor, Nurse |
| Admin Panel | `/dashboard/admin` | Admin |
| Patient Portal | `/patient/[queueRef]` | Public |
