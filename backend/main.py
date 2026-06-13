from fastapi import FastAPI, UploadFile, File, Form
import os
import requests
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
import random
import chardet
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

load_dotenv()

# ─── Optional cachetools (graceful fallback) ─────────────────────────────────
try:
    from cachetools import TTLCache
    cache = TTLCache(maxsize=100, ttl=300)
    CACHE_AVAILABLE = True
    print("✅ cachetools loaded — TTL cache active (5 min)")
except ImportError:
    # Simple dict fallback — no TTL, but won't crash
    cache = {}
    CACHE_AVAILABLE = False
    print("⚠️  cachetools not installed — using simple dict cache (no TTL). Run: pip install cachetools")

# ─── Supabase ────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fydfhzulozwjncbnmmwa.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZGZoenVsb3p3am5jYm5tbXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDY3NTcsImV4cCI6MjA5NTQyMjc1N30.6JCeGDkmhMWBph02qK3_EgxjBjHfE43_MsXlrCTmLqo")
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ─── Groq AI ──────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    print("✅ Groq AI is ready!")
else:
    print("⚠️  No GROQ_API_KEY found — AI insights disabled.")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://pathviz-app.vercel.app",
        "https://pathviz.vercel.app",
        "https://pathviz-production.up.railway.app",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── India Benchmarks ────────────────────────────────────────────────────────
BENCHMARKS = {
    "marketing":  {"avg_cac": 85.0,  "avg_ltv": 210.0, "avg_roi": 85.0,      "source": "AppsFlyer India 2024"},
    "stock":      {"avg_annual_return": 12.5, "avg_volatility": 18.0, "avg_sharpe": 0.65, "source": "NSE India 2024"},
    "hr":         {"avg_attrition": 18.0, "avg_cost_per_hire": 45000.0, "avg_time_to_hire": 35.0, "avg_engagement": 65.0, "source": "SHRM India 2024"},
    "sales":      {"avg_conversion": 22.0, "avg_deal_size": 85000.0, "avg_cycle_days": 42.0, "avg_win_rate": 30.0, "source": "LinkedIn India 2024"},
    "ecommerce":  {"avg_aov": 1250.0, "avg_cart_abandonment": 68.0, "avg_return_rate": 12.0, "avg_conversion": 2.8, "source": "Unicommerce India 2024"},
    "research":   {"avg_h_index": 15.0, "avg_citations_per_paper": 25.0, "avg_impact_factor": 2.5, "source": "Scopus India 2024"},
    "medical":    {"avg_patient_outcome": 85.0, "avg_readmission_rate": 15.0, "avg_cost_per_treatment": 25000.0, "source": "NHA India 2024"},
    "fintech":    {"avg_customer_acquisition": 450.0, "avg_transaction_value": 2500.0, "avg_apr": 12.0, "source": "RBI FinTech Report 2024"},
}

# ─── Column Fuzzy Mapper ─────────────────────────────────────────────────────
COLUMN_ALIASES = {
    "spend":          ["spend", "cost", "ad_spend", "budget", "expense", "marketing_spend"],
    "installs":       ["installs", "downloads", "acquisitions", "new_users", "signups"],
    "revenue":        ["revenue", "income", "sales", "total_revenue", "earnings", "gmv"],
    "active_users":   ["active_users", "activeusers", "dau", "mau", "users", "retention"],
    "close":          ["close", "closing_price", "price", "adj_close"],
    "volume":         ["volume", "vol", "trade_volume", "shares_traded"],
    "date":           ["date", "time", "timestamp", "trading_date", "day"],
    "employees":      ["employees", "headcount", "total_employees", "staff", "workforce"],
    "attrition":      ["attrition", "attrition_rate", "turnover", "churn"],
    "cost_per_hire":  ["cost_per_hire", "hiring_cost", "recruitment_cost"],
    "time_to_hire":   ["time_to_hire", "days_to_hire", "hiring_days", "tat"],
    "engagement_score": ["engagement_score", "engagement", "esat"],
    "deal_size":      ["deal_size", "deal_value", "contract_value", "deal_amount"],
    "status":         ["status", "stage", "outcome", "result", "deal_status"],
    "sales_cycle_days": ["sales_cycle_days", "cycle_days", "days_to_close"],
    "order_value":    ["order_value", "aov", "basket_size", "cart_value"],
    "cart_abandoned": ["cart_abandoned", "abandoned", "abandoned_carts"],
    "returned":       ["returned", "returns", "refunded", "return_rate"],
    "converted":      ["converted", "conversions", "purchases", "completed_orders"],
    "papers":         ["papers", "publications", "articles", "documents"],
    "citations":      ["citations", "total_citations", "cites", "ref_count"],
    "impact_factor":  ["impact_factor", "if", "journal_if", "jif"],
    "patients":       ["patients", "total_patients", "cases", "admissions"],
    "readmissions":   ["readmissions", "readmission_rate", "rehospitalizations"],
    "treatment_cost": ["treatment_cost", "cost_per_treatment", "procedure_cost", "avg_cost"],
    "transactions":   ["transactions", "txn_count", "total_transactions", "payments"],
    "loan_amount":    ["loan_amount", "loan_value", "disbursement", "principal"],
    "default_rate":   ["default_rate", "defaults", "delinquency", "npd_rate"],
}


def fuzzy_map_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = (
        df.columns.str.lower()
        .str.strip()
        .str.replace(" ", "_", regex=False)
        .str.replace("-", "_", regex=False)
    )
    rename_map = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for col in df.columns:
            if col in aliases and canonical not in rename_map.values():
                rename_map[col] = canonical
                break
    return df.rename(columns=rename_map)


def safe_col(df: pd.DataFrame, name: str, default: float = 0) -> pd.Series:
    if name in df.columns:
        return pd.to_numeric(df[name], errors="coerce").fillna(default)
    return pd.Series([default] * len(df))


def read_uploaded_file(contents: bytes, filename: str = "") -> pd.DataFrame:
    filename = filename.lower()
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            df = pd.read_excel(io.BytesIO(contents), sheet_name=0, header=0)
            df = df.dropna(how="all").dropna(axis=1, how="all")
            return df
        except Exception as e:
            raise ValueError(f"Could not read Excel file: {e}")
    detected = chardet.detect(contents)
    encoding = detected.get("encoding") or "utf-8"
    for enc in [encoding, "utf-8", "latin-1", "cp1252", "utf-16"]:
        try:
            text = contents.decode(enc, errors="replace")
            df = pd.read_csv(
                io.StringIO(text),
                on_bad_lines="skip",
                skip_blank_lines=True,
                low_memory=False,
            )
            df = df.dropna(how="all").dropna(axis=1, how="all")
            if not df.empty:
                return df
        except Exception:
            continue
    raise ValueError("Could not parse file. Please check if it's a valid CSV or Excel file.")


def predict_trend(values, periods_ahead: int = 3):
    values = [v for v in values if v is not None and not np.isnan(v)]
    if len(values) < 2:
        return None
    x = np.array(range(len(values))).reshape(-1, 1)
    y = np.array(values)
    model = LinearRegression()
    model.fit(x, y)
    future_x = np.array(range(len(values), len(values) + periods_ahead)).reshape(-1, 1)
    predictions = model.predict(future_x)
    slope = model.coef_[0]
    r_squared = model.score(x, y)
    return {
        "predictions": [round(float(p), 2) for p in predictions],
        "trend": "increasing" if slope > 0 else "decreasing",
        "confidence": round(float(r_squared) * 100, 1),
    }


def get_ai_insights(metrics: dict, industry: str):
    if not GROQ_API_KEY:
        return None
    metrics_text = "\n".join([f"- {k}: {v}" for k, v in metrics.items()])
    prompt = f"""You are a business analyst for Indian small businesses.
Industry: {industry}
User metrics:
{metrics_text}

Give exactly 3 short insights (max 20 words each):
1. One strength
2. One area to improve
3. One India-market specific tip
Be direct. Start each line with the number and period."""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": "You are a practical Indian business analyst. Be concise."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.6,
                "max_tokens": 300,
            },
            timeout=10,
        )
        if response.status_code == 200:
            ai_text = response.json()["choices"][0]["message"]["content"]
            lines = [l.strip() for l in ai_text.split("\n") if l.strip()]
            statuses = ["excellent", "warning", "info"]
            insights = []
            for i, line in enumerate(lines[:3]):
                if len(line) > 2 and line[0].isdigit() and line[1] in ".)":
                    line = line[2:].strip()
                insights.append({"status": statuses[i], "message": line})
            return insights if insights else None
    except Exception as e:
        print(f"Groq error: {e}")
    return None


def save_to_supabase(industry, metrics, insights, predictions):
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/analyses",
            headers=SUPABASE_HEADERS,
            json={
                "industry": industry,
                "metrics": metrics,
                "insights": insights,
                "predictions": predictions,
            },
            timeout=5,
        )
    except Exception as e:
        print(f"Supabase save error: {e}")


# ─── Cache helper — works with both TTLCache and plain dict ──────────────────
def cache_get(key: str):
    try:
        return cache.get(key)
    except Exception:
        return None


def cache_set(key: str, value):
    try:
        cache[key] = value
    except Exception:
        pass


# ============================================
# INDUSTRY ANALYZERS
# ============================================

def analyze_marketing(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    spend = safe_col(df, "spend").sum()
    installs = safe_col(df, "installs").sum()
    revenue = safe_col(df, "revenue").sum()
    active = safe_col(df, "active_users").sum() or installs * 0.7
    cac = round(spend / installs, 2) if installs > 0 else 0
    ltv = round(revenue / active, 2) if active > 0 else 0
    roi = round(((revenue - spend) / spend) * 100, 2) if spend > 0 else 0
    b = BENCHMARKS["marketing"]
    return {
        "industry": "marketing",
        "metrics": {"CAC": f"₹{cac}", "LTV": f"₹{ltv}", "ROI": f"{roi}%"},
        "chart_data": [
            {"name": "CAC",  "Yours": cac,  "India Avg": b["avg_cac"]},
            {"name": "LTV",  "Yours": ltv,  "India Avg": b["avg_ltv"]},
            {"name": "ROI",  "Yours": roi,  "India Avg": b["avg_roi"]},
        ],
        "predictions": [],
        "insights": [{"status": "info", "message": "Marketing analysis complete"}],
        "source": b["source"],
    }


def analyze_stock(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    close = safe_col(df, "close")
    if close.sum() == 0:
        close = pd.Series([random.uniform(100, 500) for _ in range(len(df))])
    returns = close.pct_change().dropna()
    annual_return = round(float(returns.mean()) * 252 * 100, 2)
    volatility = round(float(returns.std()) * np.sqrt(252) * 100, 2)
    sharpe = round(annual_return / volatility, 2) if volatility > 0 else 0
    win_rate = round((returns > 0).sum() / len(returns) * 100, 1) if len(returns) > 0 else 0
    b = BENCHMARKS["stock"]
    return {
        "industry": "stock",
        "metrics": {
            "Annual Return": f"{annual_return}%",
            "Volatility": f"{volatility}%",
            "Sharpe Ratio": sharpe,
            "Win Rate": f"{win_rate}%",
        },
        "chart_data": [
            {"name": "Annual Return %", "Yours": annual_return, "India Avg": b["avg_annual_return"]},
            {"name": "Volatility %",    "Yours": volatility,    "India Avg": b["avg_volatility"]},
            {"name": "Sharpe Ratio",    "Yours": sharpe,        "India Avg": b["avg_sharpe"]},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


def analyze_hr(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    attrition = round(safe_col(df, "attrition").mean(), 1)
    cost_hire = round(safe_col(df, "cost_per_hire").mean(), 0)
    time_hire = round(safe_col(df, "time_to_hire").mean(), 1)
    engagement = round(safe_col(df, "engagement_score").mean(), 1)
    b = BENCHMARKS["hr"]
    return {
        "industry": "hr",
        "metrics": {
            "Attrition Rate": f"{attrition}%",
            "Cost per Hire": f"₹{int(cost_hire):,}",
            "Time to Hire": f"{time_hire} days",
            "Engagement Score": f"{engagement}/100",
        },
        "chart_data": [
            {"name": "Attrition %",    "Yours": attrition,  "India Avg": b["avg_attrition"]},
            {"name": "Cost/Hire (₹K)", "Yours": round(cost_hire / 1000, 1), "India Avg": round(b["avg_cost_per_hire"] / 1000, 1)},
            {"name": "Engagement",     "Yours": engagement, "India Avg": b["avg_engagement"]},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


def analyze_sales(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    avg_deal = round(safe_col(df, "deal_size").mean(), 0)
    avg_cycle = round(safe_col(df, "sales_cycle_days").mean(), 1)
    status_col = df.get("status", pd.Series(dtype=str))
    win_rate = 0.0
    if len(status_col) > 0:
        won = status_col.str.lower().str.contains("won|win|closed", na=False).sum()
        win_rate = round(won / len(status_col) * 100, 1)
    b = BENCHMARKS["sales"]
    return {
        "industry": "sales",
        "metrics": {
            "Avg Deal Size": f"₹{int(avg_deal):,}",
            "Win Rate": f"{win_rate}%",
            "Avg Sales Cycle": f"{avg_cycle} days",
        },
        "chart_data": [
            {"name": "Avg Deal (₹K)",  "Yours": round(avg_deal / 1000, 1), "India Avg": round(b["avg_deal_size"] / 1000, 1)},
            {"name": "Win Rate %",     "Yours": win_rate,   "India Avg": b["avg_win_rate"]},
            {"name": "Cycle Days",     "Yours": avg_cycle,  "India Avg": b["avg_cycle_days"]},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


def analyze_ecommerce(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    aov = round(safe_col(df, "order_value").mean(), 2)
    total = len(df)
    cart_abandoned_count = safe_col(df, "cart_abandoned").sum()
    returned_count = safe_col(df, "returned").sum()
    converted_count = safe_col(df, "converted").sum()
    cart_abandonment_rate = round(cart_abandoned_count / (cart_abandoned_count + converted_count) * 100, 1) if (cart_abandoned_count + converted_count) > 0 else 0
    return_rate = round(returned_count / total * 100, 1) if total > 0 else 0
    b = BENCHMARKS["ecommerce"]
    return {
        "industry": "ecommerce",
        "metrics": {
            "Avg Order Value": f"₹{aov:,.0f}",
            "Cart Abandonment": f"{cart_abandonment_rate}%",
            "Return Rate": f"{return_rate}%",
        },
        "chart_data": [
            {"name": "AOV (₹)",           "Yours": aov,                  "India Avg": b["avg_aov"]},
            {"name": "Cart Abandon %",    "Yours": cart_abandonment_rate, "India Avg": b["avg_cart_abandonment"]},
            {"name": "Return Rate %",     "Yours": return_rate,           "India Avg": b["avg_return_rate"]},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


def analyze_research(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    papers = safe_col(df, "papers").sum() or len(df)
    citations = safe_col(df, "citations").sum()
    avg_citations = round(citations / papers, 2) if papers > 0 else 0
    avg_if = round(safe_col(df, "impact_factor").mean(), 2)

    # h-index calculation
    citation_list = sorted(safe_col(df, "citations").tolist(), reverse=True)
    h_index = 0
    for i, cite in enumerate(citation_list, 1):
        if cite >= i:
            h_index = i
        else:
            break

    b = BENCHMARKS["research"]
    return {
        "industry": "research",
        "metrics": {
            "Total Papers": str(int(papers)),
            "Total Citations": str(int(citations)),
            "Avg Citations/Paper": avg_citations,
            "h-index": h_index,
            "Avg Impact Factor": avg_if,
        },
        "chart_data": [
            {"name": "h-index",       "Yours": h_index,       "India Avg": b["avg_h_index"]},
            {"name": "Avg Citations", "Yours": avg_citations,  "India Avg": b["avg_citations_per_paper"]},
            {"name": "Impact Factor", "Yours": avg_if,         "India Avg": b["avg_impact_factor"]},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


def analyze_medical(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    patients = safe_col(df, "patients").sum() or len(df)
    readmissions = safe_col(df, "readmissions").sum()
    readmission_rate = round((readmissions / patients) * 100, 2) if patients > 0 else 0
    treatment_cost = round(safe_col(df, "treatment_cost").mean(), 2)
    b = BENCHMARKS["medical"]
    return {
        "industry": "medical",
        "metrics": {
            "Total Patients": str(int(patients)),
            "Readmission Rate": f"{readmission_rate}%",
            "Avg Treatment Cost": f"₹{treatment_cost:,.0f}",
        },
        "chart_data": [
            {"name": "Readmission %",         "Yours": readmission_rate,                         "India Avg": b["avg_readmission_rate"]},
            {"name": "Treatment Cost (₹K)",   "Yours": round(treatment_cost / 1000, 1),           "India Avg": round(b["avg_cost_per_treatment"] / 1000, 1)},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


def analyze_fintech(df: pd.DataFrame) -> dict:
    df = fuzzy_map_columns(df)
    transactions = safe_col(df, "transactions").sum() or len(df)
    loan_amount = safe_col(df, "loan_amount").sum()
    default_rate = safe_col(df, "default_rate").mean()
    avg_transaction = round(loan_amount / transactions, 2) if transactions > 0 else 0
    b = BENCHMARKS["fintech"]
    return {
        "industry": "fintech",
        "metrics": {
            "Total Transactions": f"{int(transactions):,}",
            "Total Loan Amount": f"₹{loan_amount:,.0f}",
            "Avg Transaction Value": f"₹{avg_transaction:,.0f}",
            "Default Rate": f"{round(default_rate, 2)}%",
        },
        "chart_data": [
            {"name": "Default Rate %",     "Yours": round(default_rate, 2), "India Avg": 8.5},
            {"name": "Avg Txn Value (₹)",  "Yours": avg_transaction,        "India Avg": b["avg_transaction_value"]},
        ],
        "predictions": [],
        "insights": [],
        "source": b["source"],
    }


ANALYZERS = {
    "marketing": analyze_marketing,
    "stock":     analyze_stock,
    "hr":        analyze_hr,
    "sales":     analyze_sales,
    "ecommerce": analyze_ecommerce,
    "research":  analyze_research,
    "medical":   analyze_medical,
    "fintech":   analyze_fintech,
}


# ============================================
# SAMPLE DATA GENERATORS
# ============================================

def sample_marketing():
    campaigns = ["Google Ads", "Meta Ads", "Instagram", "YouTube", "Organic"]
    rows = []
    for i, c in enumerate(campaigns):
        spend = random.randint(3000, 9000)
        installs = random.randint(100, 400)
        revenue = spend * random.uniform(1.5, 3.0)
        rows.append({
            "campaign": c, "month": i + 1, "spend": spend,
            "installs": installs, "revenue": round(revenue, 2),
            "active_users": int(installs * random.uniform(0.6, 0.9)),
        })
    return pd.DataFrame(rows)


def sample_stock():
    rows = []
    price = random.uniform(18000, 22000)
    for i in range(30):
        change = random.uniform(-0.025, 0.03)
        price = price * (1 + change)
        rows.append({
            "date": (datetime.now() - timedelta(days=30 - i)).strftime("%Y-%m-%d"),
            "close": round(price, 2),
            "volume": random.randint(5000000, 20000000),
        })
    return pd.DataFrame(rows)


def sample_hr():
    depts = ["Engineering", "Sales", "Marketing", "Operations", "Support"]
    rows = []
    for d in depts:
        rows.append({
            "department": d,
            "employees": random.randint(20, 100),
            "attrition": round(random.uniform(8, 30), 1),
            "cost_per_hire": random.randint(30000, 80000),
            "time_to_hire": random.randint(20, 60),
            "engagement_score": random.randint(50, 90),
        })
    return pd.DataFrame(rows)


def sample_sales():
    statuses = ["Won", "Lost", "Won", "Won", "Lost", "Won", "Lost"]
    rows = []
    for _ in range(20):
        rows.append({
            "deal_size": random.randint(20000, 200000),
            "status": random.choice(statuses),
            "sales_cycle_days": random.randint(15, 90),
        })
    return pd.DataFrame(rows)


def sample_ecommerce():
    rows = []
    for _ in range(30):
        rows.append({
            "order_value": round(random.uniform(500, 3000), 2),
            "cart_abandoned": random.randint(0, 1),
            "returned": random.randint(0, 1),
            "converted": random.randint(50, 300),
        })
    return pd.DataFrame(rows)


def sample_research():
    rows = []
    for i in range(10):
        rows.append({
            "paper_id": i + 1,
            "papers": random.randint(5, 50),
            "citations": random.randint(10, 500),
            "impact_factor": round(random.uniform(1.0, 5.0), 2),
        })
    return pd.DataFrame(rows)


def sample_medical():
    rows = []
    for i in range(30):
        rows.append({
            "patient_id": i + 1,
            "patients": 1,
            "readmissions": random.choice([0, 0, 0, 1]),
            "treatment_cost": random.randint(10000, 50000),
        })
    return pd.DataFrame(rows)


def sample_fintech():
    rows = []
    for i in range(50):
        rows.append({
            "transaction_id": i + 1,
            "transactions": 1,
            "loan_amount": random.randint(5000, 100000),
            "default_rate": round(random.uniform(0, 15), 2),
        })
    return pd.DataFrame(rows)


SAMPLE_GENERATORS = {
    "marketing": sample_marketing,
    "stock":     sample_stock,
    "hr":        sample_hr,
    "sales":     sample_sales,
    "ecommerce": sample_ecommerce,
    "research":  sample_research,
    "medical":   sample_medical,
    "fintech":   sample_fintech,
}

MOCK_APIS = ["google_ads", "meta_ads", "hubspot"]


# ============================================
# ROUTES
# ============================================

@app.get("/")
def home():
    return {
        "message": "PathViz backend is running",
        "groq_enabled": bool(GROQ_API_KEY),
        "cache_type": "TTLCache" if CACHE_AVAILABLE else "dict",
        "cache_size": len(cache),
        "industries": list(ANALYZERS.keys()),
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "groq": bool(GROQ_API_KEY),
        "supabase": bool(SUPABASE_KEY),
        "cache_type": "TTLCache" if CACHE_AVAILABLE else "dict",
        "cache_size": len(cache),
    }


@app.get("/cache/stats")
def cache_stats():
    return {
        "cache_type": "TTLCache" if CACHE_AVAILABLE else "dict (no TTL)",
        "cache_size": len(cache),
        "max_size": getattr(cache, "maxsize", "unlimited"),
        "ttl_seconds": 300 if CACHE_AVAILABLE else "N/A",
    }


@app.get("/trends/{keyword}")
async def get_google_trends(keyword: str):
    """Google Trends data for a keyword (5-min cache)."""
    cache_key = f"trends_{keyword.lower()}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    # Try real pytrends; fall back to mock if unavailable
    try:
        from pytrends.request import TrendReq
        pytrends = TrendReq(hl="en-IN", tz=330)
        pytrends.build_payload([keyword], timeframe="today 3-m", geo="IN")
        data = pytrends.interest_over_time()
        if not data.empty and keyword in data.columns:
            interest_list = data[keyword].tolist()
            result = {
                "keyword": keyword,
                "interest_over_time": interest_list,
                "current_interest": int(interest_list[-1]) if interest_list else 0,
                "source": "Google Trends (Live via pytrends)",
                "cached_until": (datetime.now() + timedelta(minutes=5)).isoformat(),
            }
        else:
            raise ValueError("Empty data from pytrends")
    except Exception as e:
        print(f"pytrends error ({e}) — returning mock data")
        result = {
            "keyword": keyword,
            "interest_over_time": [random.randint(20, 100) for _ in range(90)],
            "current_interest": random.randint(30, 90),
            "source": "Google Trends (Mock — install pytrends for live data)",
            "cached_until": (datetime.now() + timedelta(minutes=5)).isoformat(),
        }

    cache_set(cache_key, result)
    return result


@app.get("/stock/{symbol}")
async def get_live_stock(symbol: str):
    """Live stock data from Yahoo Finance (5-min cache)."""
    cache_key = f"stock_{symbol.upper()}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        import yfinance as yf

        original_symbol = symbol.upper()
        # Auto-append .NS if no exchange suffix
        if not original_symbol.endswith(".NS") and not original_symbol.endswith(".BO"):
            nse_symbol = original_symbol + ".NS"
            ticker = yf.Ticker(nse_symbol)
            info = ticker.info
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            if current_price == 0:
                ticker = yf.Ticker(original_symbol + ".BO")
                info = ticker.info
                current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        else:
            ticker = yf.Ticker(original_symbol)
            info = ticker.info
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0

        hist = ticker.history(period="3mo")
        metrics = {}
        prediction = None

        if not hist.empty and len(hist) > 5:
            hist["Return"] = hist["Close"].pct_change()
            avg_return = hist["Return"].mean() * 100
            volatility = hist["Return"].std() * 100
            metrics = {
                "avg_daily_return": f"{round(avg_return, 2)}%",
                "volatility": f"{round(volatility, 2)}%",
                "sharpe_ratio": round(avg_return / volatility, 2) if volatility > 0 else 0,
            }
            close_values = hist["Close"].values.tolist()
            if len(close_values) >= 10:
                x = np.array(range(len(close_values))).reshape(-1, 1)
                y = np.array(close_values)
                model = LinearRegression()
                model.fit(x, y)
                future_x = np.array(range(len(close_values), len(close_values) + 30)).reshape(-1, 1)
                future_prices = model.predict(future_x)
                prediction = {
                    "next_30_days": [round(float(p), 2) for p in future_prices[:5]],
                    "trend": "increasing" if model.coef_[0] > 0 else "decreasing",
                    "confidence": round(float(model.score(x, y)) * 100, 1),
                }

        company_name = (
            info.get("longName")
            or info.get("shortName")
            or original_symbol.replace(".NS", "").replace(".BO", "")
        )

        result = {
            "symbol": original_symbol,
            "company_name": company_name,
            "current_price": current_price,
            "day_change": round(info.get("regularMarketChange", 0), 2),
            "day_change_percent": round(info.get("regularMarketChangePercent", 0), 2),
            "volume": info.get("volume", 0),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0),
            "week_52_high": info.get("fiftyTwoWeekHigh", 0),
            "week_52_low": info.get("fiftyTwoWeekLow", 0),
            **metrics,
            "prediction": prediction,
            "cached_until": (datetime.now() + timedelta(minutes=5)).isoformat(),
        }

    except ImportError:
        result = {
            "error": "yfinance not installed. Run: pip install yfinance",
            "symbol": symbol.upper(),
            "company_name": symbol.upper(),
            "current_price": 0,
        }
    except Exception as e:
        result = {"error": str(e), "symbol": symbol.upper(), "current_price": 0}

    cache_set(cache_key, result)
    return result


@app.post("/analyze")
async def analyze_csv(
    file: UploadFile = File(None),
    industry: str = Form("marketing"),
    use_sample: str = Form("false"),
    mock_platform: str = Form(""),
):
    try:
        analyzer = ANALYZERS.get(industry, analyze_marketing)

        if use_sample == "true" or mock_platform:
            gen = SAMPLE_GENERATORS.get(industry, sample_marketing)
            df = gen()
        else:
            if not file:
                return {"error": "No file provided. Please upload a CSV or Excel file."}
            contents = await file.read()
            if not contents:
                return {"error": "The uploaded file is empty."}
            try:
                df = read_uploaded_file(contents, file.filename or "")
            except ValueError as ve:
                return {"error": str(ve)}

        if df.empty:
            return {"error": "File loaded but contains no usable data rows."}

        result = analyzer(df)

        # Attach AI insights
        ai_insights = get_ai_insights(result.get("metrics", {}), industry)
        if ai_insights:
            result["insights"] = ai_insights
            result["ai_used"] = True
        else:
            result.setdefault("ai_used", False)

        save_to_supabase(
            industry=industry,
            metrics=result.get("metrics", {}),
            insights=result.get("insights", []),
            predictions=result.get("predictions", []),
        )

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Analysis failed: {str(e)}"}


# ============================================
# RUN
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))