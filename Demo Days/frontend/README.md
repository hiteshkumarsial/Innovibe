# BarRaiser AI - Mobile Client (Expo Go)

Minimalist React Native client for the BarRaiser AI interview interrogator.

---

## 🚀 Running the App

### 1. Make sure the FastAPI Backend is running
In one terminal:
```bash
cd backend
.\venv\Scripts\activate
python run.py
```

### 2. Start Expo in Localhost Mode
In a second terminal:
```bash
cd frontend
npx expo start --localhost
```
Or:
```bash
npm run start:localhost
```

---

## 📱 Viewing on Your Phone / Web
- **In Web Browser:** Press `w` in the Expo terminal.
- **On Physical Phone (Expo Go):** Open Expo Go and connect, or scan the QR code.
  *(Note: When running on a physical phone, set `API_BASE_URL` in `src/config.ts` to your PC's local Wi-Fi IP address like `http://192.168.1.X:8000/api`).*
