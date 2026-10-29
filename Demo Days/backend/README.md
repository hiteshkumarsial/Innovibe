# BarRaiser AI - Backend Engine

The backend for **BarRaiser AI** — an adaptive, high-signal technical mock interviewer that interrogates candidates on their projects, catches bluffing, and generates actionable post-mortems.

---

## 🚀 Quickstart

### 1. Activate Virtual Environment
```bash
cd backend
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 2. Start the API Server
```bash
python run.py
```
The server will boot on `http://127.0.0.1:8000`.

### 3. Open Interactive Swagger Docs
Open your browser and navigate to:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

---

## ⚙️ Configuration (.env)

The backend is pre-configured with a **local Mock engine** so it works immediately out of the box with zero external API keys.

To enable real LLM intelligence:
1. Open `.env`
2. Change `LLM_PROVIDER="gemini"` or `LLM_PROVIDER="openai"`
3. Paste your API key into `GEMINI_API_KEY` or `OPENAI_API_KEY`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health check and active LLM provider |
| `POST` | `/api/interview/start` | Creates a new session, scans project claims for loopholes, and returns opening question |
| `POST` | `/api/interview/answer` | Submits candidate answer, performs deep follow-up probing (3-deep rule), and returns next question |
| `POST` | `/api/interview/{id}/finish` | Concludes the interview early and generates the Bar Raiser Diagnostic Report |
| `GET` | `/api/interview/{id}` | Retrieves complete session transcript and performance diagnostic |

---

## 🧪 Run Integration Tests
```bash
python test_api.py
```
