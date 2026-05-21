# ⚡ DisciplineX — AI Productivity Coach & Routine Optimizer

**DisciplineX** is an ultra-premium, full-stack productivity engine designed to compile daily routines, maintain consistency streaks, and analyze cognitive performance trends. It features a standard **2D Material Design** system (inspired by Google Chrome and Play Store) paired with an exclusive, high-fidelity **AI Coach page** powered by a reactive **3D Brand Monogram Logo hologram**.

---

## ✨ Features & Architecture

### 1. 🧠 AI Productivity Coach (Trained on Local Data)
* Engage in interactive coaching consultations grounded directly in your real-time routine completions, Streaks, Focus Logs, and Peak active hours.
* Natively renders detailed diagnostic performance checklists, habit risk indices, and suggested schedule blocks.
* Deployed with **100% Offline Resilience** (reverting dynamically to local backup storage) to prevent database or network API downtime.

### 2. 🌌 Exclusive Cybernetic 3D Monogram Hologram
* A stunning three-dimensional rendition of the brand "DX" monogram built purely on performant **CSS 3D perspective layers**.
* Features **mouse-tracking parallax tilt** (tilts up to 25 degrees following your mouse cursor) and speeds up to active processing spins during AI thinking states.
* Bounded by counter-rotating dashed cyro-scope rings and animated translucent purple/blue aurora glowing backplates.

### 3. 🛡️ Robust Security & UX Cleanups
* Hashed authentication workflows featuring secure bcrypt password fallback mechanisms.
* Resilient Windows Node DNS SRV resolutions configuring public Google servers (`8.8.8.8`) to bypass lookup timeouts.

---

## 📂 Repository Structure

```
DisciplineX/
├── backend/                  # Express REST API Backend
│   ├── src/
│   │   ├── config/           # DB & DNS configurations
│   │   ├── controllers/      # AI, Auth & Analytics logic
│   │   ├── models/           # MongoDB schemas & fallbacks
│   │   └── server.js         # API Server startup core
│   ├── .env.example          # Sample environment variables
│   └── package.json          
│
├── frontend/                 # React & Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/            # AICoach, Dashboard, Analytics, Settings
│   │   └── App.jsx           # Main routing & layout engine
│   └── package.json
│
└── .gitignore                # Global Git exclusion rules
```

---

## 🚀 Local Installation & Setup

### 1. Backend Setup
1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The API will start listening on port `5000`.*

### 2. Frontend Setup
1. Navigate into the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend website will open on [http://localhost:5173/](http://localhost:5173/).*

---

## 🛠️ Verification & Production Build
To verify type and ESM module compilation integrity, compile a production-ready client bundle:
```bash
cd frontend
npm run build
```

---

## 📄 License
This project is licensed under the MIT License.
