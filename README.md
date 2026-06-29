# PathViz — AI-Powered Analytics for Indian Businesses

<div align="center">

![PathViz Banner](https://img.shields.io/badge/PathViz-Analytics%20for%20India-2dd4bf?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzJkZDRiZiIgZD0iTTEyIDJMMiA3bDEwIDUgMTAtNUwxMiAyek0yIDE3bDEwIDUgMTAtNW0tMTAtNWwxMCA1IDEwLTUiLz48L3N2Zz4=)

**Upload your business data. Get AI insights benchmarked against India's market.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pathviz--app.vercel.app-2dd4bf?style=flat-square&logo=vercel)](https://pathviz-app.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-blueviolet?style=flat-square&logo=railway)](https://pathviz-production.up.railway.app/health)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Made in India](https://img.shields.io/badge/Made%20in-India%20🇮🇳-orange?style=flat-square)]()

</div>

---

## What is PathViz?

PathViz is a full-stack AI analytics web app built specifically for **Indian small businesses, startups, and growth teams**. Upload any CSV or Excel file — messy, incomplete, or raw — and instantly get:

- 📊 Key business metrics calculated automatically
- 🇮🇳 Benchmarks compared against **India industry averages**
- 🔮 **3-month predictions** powered by machine learning
- ✨ **AI-generated insights** via Groq (Llama 3.1)
- 💾 Analysis history saved to cloud database

No data science knowledge needed. Just upload and go.

---

## Live Demo

| Platform | URL |
|----------|-----|
| 🌐 Frontend | [pathviz-app.vercel.app](https://pathviz-app.vercel.app) |
| ⚙️ Backend API | [pathviz-production.up.railway.app](https://pathviz-production.up.railway.app/health) |

---

## Features

### 5 Industry Verticals
| Industry | Metrics | India Benchmark Source |
|----------|---------|----------------------|
| 📱 **Marketing Analytics** | CAC, LTV, ROI, CTR, LTV:CAC Ratio | AppsFlyer India Report 2024 |
| 📈 **Stock Market** | Returns, Volatility, Sharpe Ratio, Max Drawdown | NSE India Historical Data 2024 |
| 👥 **HR Analytics** | Attrition, Cost per Hire, Time to Hire, Engagement | SHRM India HR Report 2024 |
| 💼 **Sales Analytics** | Win Rate, Deal Size, Sales Cycle, Pipeline Value | LinkedIn India Sales Report 2024 |
| 🛒 **E-commerce** | AOV, Cart Abandonment, Return Rate, Conversion | Unicommerce India Report 2024 |

### Smart File Handling
- ✅ CSV and Excel (.xlsx, .xls) support
- ✅ Auto-detects file encoding (UTF-8, Latin-1, UTF-16, CP1252)
- ✅ Handles missing columns — analyzes whatever data exists
- ✅ Skips bad/corrupt rows automatically
- ✅ 50+ column name aliases (e.g. `"Rev"`, `"income"`, `"earnings"` all map to `revenue`)

### AI & ML
- ✨ **Groq AI (Llama 3.1)** — India-context business insights in seconds
- 🔮 **Scikit-learn Linear Regression** — 3-month metric forecasts with confidence scores
- 📉 Trend detection (increasing / decreasing) with directional arrows

### Data Sources
- 🎲 Sample data generator for all 5 industries (realistic India market ranges)
- 🔵 Mock API simulator — Google Ads, Meta Ads, HubSpot CRM
- 📁 Your own CSV/Excel upload

---

## Tech Stack

```
Frontend                    Backend                     Infrastructure
─────────────────────       ─────────────────────       ─────────────────────
React 18                    FastAPI (Python)             Vercel (Frontend)
Recharts                    Pandas                      Railway (Backend)
Axios                       Scikit-learn                Supabase (Database)
CSS-in-JS                   NumPy                       GitHub (CI/CD)
                            Chardet
                            Groq SDK (Llama 3.1)
                            Python-dotenv
```

---

## Project Structure

```
pathviz/
├── frontend/
│   └── src/
│       └── App.js              ← Entire React app (single file)
├── backend/
│   ├── main.py                 ← FastAPI server — all logic lives here
│   ├── requirements.txt        ← Python dependencies
│   ├── Procfile                ← Railway start command
│   └── .env                   ← API keys (not committed)
├── .gitignore
└── README.md
```

---

## Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)
- A free [Supabase](https://supabase.com) project

### 1. Clone the repo
```bash
git clone https://github.com/mansilavania1297-alt/Pathviz.git
cd Pathviz
```

### 2. Backend setup
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `/backend`:
```env
GROQ_API_KEY=your_groq_key_here
```

Start the backend:
```bash
uvicorn main:app --reload
```
Backend runs at `http://localhost:8000`

### 3. Frontend setup
```bash
cd frontend
npm install
npm start
```
Frontend runs at `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | Detailed status (Groq, Supabase) |
| `POST` | `/analyze` | Main analysis endpoint |
| `GET` | `/sample/{industry}` | Get sample data for an industry |
| `GET` | `/benchmarks/{industry}` | Get India benchmarks |

### `/analyze` — POST

**Form fields:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | CSV or Excel file (optional if use_sample=true) |
| `industry` | string | `marketing` / `stock` / `hr` / `sales` / `ecommerce` |
| `use_sample` | string | `"true"` to use built-in sample data |
| `mock_platform` | string | `google_ads` / `meta_ads` / `hubspot` |

**Response:**
```json
{
  "industry": "marketing",
  "metrics": { "CAC": "₹72.50", "LTV": "₹218.00", "ROI": "94.2%" },
  "chart_data": [{ "name": "CAC (₹)", "Yours": 72.5, "India Avg": 85.0 }],
  "predictions": [{ "metric": "Revenue Next 3 Months", "values": ["₹48,200", "₹51,400", "₹54,800"], "trend": "increasing", "confidence": 91.2 }],
  "insights": [{ "status": "excellent", "message": "CAC ₹72.50 is 15% below India average" }],
  "ai_insights": [{ "status": "excellent", "message": "Strong acquisition efficiency for Indian market" }],
  "source": "AppsFlyer India Report 2024"
}
```

---

## Deployment

### Frontend → Vercel
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set **Root Directory** to `frontend`
4. Add environment variable: `REACT_APP_API_URL` = your Railway URL
5. Deploy — auto-detects React

### Backend → Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Set **Root Directory** to `backend`
3. Add environment variables:
   - `GROQ_API_KEY` = your Groq key
   - `PORT` = `8000`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Deploy

---

## Sample Data Ranges (India Market)

| Industry | Data Points | Range |
|----------|-------------|-------|
| Stock Market | 30 days OHLCV | Nifty 50 price bands (₹18,000–₹22,000) |
| Marketing | 5 campaigns | Spend ₹3,000–₹9,000 per campaign |
| HR | 5 departments | Attrition 8–30%, Engagement 50–90 |
| Sales | 20 deals | Deal size ₹20,000–₹2,00,000 |
| E-commerce | 30 days orders | AOV ₹500–₹3,000 |

---

## Roadmap

- [x] 5 industry verticals with India benchmarks
- [x] AI insights via Groq (Llama 3.1)
- [x] 3-month ML predictions
- [x] Robust CSV/Excel parsing (messy data support)
- [x] Supabase history tracking
- [x] Vercel + Railway deployment
- [ ] Real-time NSE/BSE stock data feed
- [ ] Research & Academic analysis vertical
- [ ] Medical / Clinical analytics vertical
- [ ] PDF export of analysis reports
- [ ] User accounts (Supabase Auth)
- [ ] Razorpay subscription payments (₹499/mo Pro plan)
- [ ] Mobile responsive layout
- [ ] Google Trends API for live marketing benchmarks
- [ ] Team accounts and shared dashboards
- [ ] White-label B2B version for CA firms and consultancies

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/research-analysis`)
3. Commit your changes (`git commit -m 'add research analysis vertical'`)
4. Push and open a PR

---

## Author

**Mansi Lavania**
- GitHub: [@mansilavania1297-alt](https://github.com/mansilavania1297-alt)
- LinkedIn: [Connect with me](https://linkedin.com/in/mansilavania)
- Built with ☕ and Python in India 🇮🇳

---

## License

MIT License — free to use, modify, and distribute.

---

<div align="center">
  <strong>If this project helped you, give it a ⭐ on GitHub!</strong><br/>
  <sub>Built for India's 63 million small businesses 🇮🇳</sub>
</div>