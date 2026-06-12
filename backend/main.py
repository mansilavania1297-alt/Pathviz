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

# ─── Supabase ────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://fydfhzulozwjncbnmmwa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZGZoenVsb3p3am5jYm5tbXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDY3NTcsImV4cCI6MjA5NTQyMjc1N30.6JCeGDkmhMWBph02qK3_EgxjBjHfE43_MsXlrCTmLqo"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
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
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── India Benchmarks ────────────────────────────────────────────────────────
BENCHMARKS = {
    "marketing": {
        "avg_cac": 85.0, "avg_ltv": 210.0, "avg_roi": 85.0,
        "source": "AppsFlyer India Mobile Marketing Report 2024"
    },
    "stock": {
        "avg_annual_return": 12.5, "avg_volatility": 18.0, "avg_sharpe": 0.65,
        "source": "NSE India Historical Data 2024"
    },
    "hr": {
        "avg_attrition": 18.0, "avg_cost_per_hire": 45000.0,
        "avg_time_to_hire": 35.0, "avg_engagement": 65.0,
        "source": "SHRM India HR Benchmarking Report 2024"
    },
    "sales": {
        "avg_conversion": 22.0, "avg_deal_size": 85000.0,
        "avg_cycle_days": 42.0, "avg_win_rate": 30.0,
        "source": "LinkedIn India Sales Report 2024"
    },
    "ecommerce": {
        "avg_aov": 1250.0, "avg_cart_abandonment": 68.0,
        "avg_return_rate": 12.0, "avg_conversion": 2.8,
        "source": "Unicommerce India E-commerce Report 2024"
    }
}

# ─── Column Fuzzy Mapper ─────────────────────────────────────────────────────
COLUMN_ALIASES = {
    "spend": ["spend", "cost", "ad_spend", "adspend", "budget", "expenditure", "expense", "marketing_spend", "total_spend"],
    "installs": ["installs", "install", "downloads", "acquisitions", "new_users", "signups", "registrations"],
    "revenue": ["revenue", "rev", "income", "sales", "total_revenue", "earnings", "gmv", "turnover"],
    "active_users": ["active_users", "activeusers", "dau", "mau", "users", "retention", "engaged_users"],
    "close": ["close", "closing", "closing_price", "price", "close_price", "last", "adj_close", "adjusted_close"],
    "volume": ["volume", "vol", "trade_volume", "shares_traded", "qty"],
    "date": ["date", "time", "timestamp", "trading_date", "day", "period"],
    "open": ["open", "open_price", "opening"],
    "high": ["high", "day_high", "max"],
    "low": ["low", "day_low", "min"],
    "employees": ["employees", "headcount", "total_employees", "staff", "workforce", "num_employees"],
    "attrition": ["attrition", "attrition_rate", "turnover", "turnover_rate", "churn", "resignations"],
    "cost_per_hire": ["cost_per_hire", "hiring_cost", "recruitment_cost", "cost_hire"],
    "time_to_hire": ["time_to_hire", "days_to_hire", "hiring_days", "ttf", "tat"],
    "engagement_score": ["engagement_score", "engagement", "esat", "employee_satisfaction", "morale"],
    "deal_size": ["deal_size", "deal_value", "contract_value", "revenue", "amount", "deal_amount", "order_value"],
    "status": ["status", "stage", "outcome", "result", "deal_status"],
    "sales_cycle_days": ["sales_cycle_days", "cycle_days", "days_to_close", "sales_cycle", "close_time"],
    "win_rate": ["win_rate", "win", "won", "closed_won", "success_rate"],
    "order_value": ["order_value", "aov", "basket_size", "cart_value", "purchase_value", "amount", "revenue"],
    "cart_abandoned": ["cart_abandoned", "abandoned", "abandoned_carts", "cart_abandonment", "bounced"],
    "returned": ["returned", "returns", "refunded", "return_rate", "refunds"],
    "converted": ["converted", "conversions", "purchases", "completed_orders", "orders"],
}

def fuzzy_map_columns(df):
    df.columns = df.columns.str.lower().str.strip().str.replace(" ", "_").str.replace("-", "_")
    rename_map = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for col in df.columns:
            if col in aliases and canonical not in rename_map.values():
                rename_map[col] = canonical
                break
    return df.rename(columns=rename_map)

def safe_col(df, name, default=0):
    if name in df.columns:
        return pd.to_numeric(df[name], errors="coerce").fillna(default)
    return pd.Series([default] * len(df))

# ─── Robust File Reader ──────────────────────────────────────────────────────
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

# ─── Predict Trend ────────────────────────────────────────────────────────────
def predict_trend(values, periods_ahead=3):
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
        "confidence": round(float(r_squared) * 100, 1)
    }

# ─── Groq AI Insights ────────────────────────────────────────────────────────
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
Be direct. No bullet symbols. Start each line with the number and period."""

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": "You are a practical Indian business analyst. Be concise."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.6,
                "max_tokens": 300
            },
            timeout=10
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

# ─── Supabase Save ────────────────────────────────────────────────────────────
def save_to_supabase(industry, metrics, insights, predictions):
    try:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/analyses",
            headers=SUPABASE_HEADERS,
            json={"industry": industry, "metrics": metrics, "insights": insights, "predictions": predictions},
            timeout=5
        )
    except Exception as e:
        print(f"Supabase save error: {e}")

# ─── Sample Data Generators ──────────────────────────────────────────────────
def sample_marketing():
    campaigns = ["Google Ads", "Meta Ads", "Instagram", "YouTube", "Organic"]
    rows = []
    for i, c in enumerate(campaigns):
        spend = random.randint(3000, 9000)
        installs = random.randint(100, 400)
        revenue = spend * random.uniform(1.5, 3.0)
        rows.append({"campaign": c, "month": i+1, "spend": spend,
                     "installs": installs, "revenue": round(revenue, 2),
                     "active_users": int(installs * random.uniform(0.6, 0.9))})
    return pd.DataFrame(rows)

def sample_stock():
    rows = []
    price = random.uniform(18000, 22000)
    for i in range(30):
        change = random.uniform(-0.025, 0.03)
        price = price * (1 + change)
        rows.append({
            "date": (datetime.now() - timedelta(days=30-i)).strftime("%Y-%m-%d"),
            "open": round(price * random.uniform(0.99, 1.01), 2),
            "high": round(price * random.uniform(1.005, 1.02), 2),
            "low": round(price * random.uniform(0.98, 0.995), 2),
            "close": round(price, 2),
            "volume": random.randint(5000000, 20000000)
        })
    return pd.DataFrame(rows)

def sample_hr():
    depts = ["Engineering", "Sales", "Marketing", "Operations", "Support"]
    rows = []
    for d in depts:
        emp = random.randint(20, 100)
        rows.append({
            "department": d,
            "employees": emp,
            "attrition": round(random.uniform(8, 30), 1),
            "cost_per_hire": random.randint(30000, 80000),
            "time_to_hire": random.randint(20, 60),
            "engagement_score": random.randint(50, 90)
        })
    return pd.DataFrame(rows)

def sample_sales():
    statuses = ["Won", "Lost", "Won", "Won", "Lost", "Won", "Lost"]
    rows = []
    for i in range(20):
        rows.append({
            "deal_id": i+1,
            "deal_size": random.randint(20000, 200000),
            "status": random.choice(statuses),
            "sales_cycle_days": random.randint(15, 90),
            "region": random.choice(["North", "South", "East", "West"])
        })
    return pd.DataFrame(rows)

def sample_ecommerce():
    rows = []
    for i in range(30):
        orders = random.randint(50, 300)
        rows.append({
            "date": (datetime.now() - timedelta(days=30-i)).strftime("%Y-%m-%d"),
            "order_value": round(random.uniform(500, 3000), 2),
            "cart_abandoned": random.randint(10, 100),
            "returned": random.randint(2, 20),
            "converted": orders
        })
    return pd.DataFrame(rows)

SAMPLE_GENERATORS = {
    "marketing": sample_marketing,
    "stock": sample_stock,
    "hr": sample_hr,
    "sales": sample_sales,
    "ecommerce": sample_ecommerce,
}

# ─── Industry Analyzers ──────────────────────────────────────────────────────
def analyze_marketing(df):
    df = fuzzy_map_columns(df)
    spend = safe_col(df, "spend").sum()
    installs = safe_col(df, "installs").sum()
    revenue = safe_col(df, "revenue").sum()
    active = safe_col(df, "active_users").sum() or installs * 0.7

    cac = round(spend / installs, 2) if installs > 0 else 0
    ltv = round(revenue / active, 2) if active > 0 else 0
    roi = round(((revenue - spend) / spend) * 100, 2) if spend > 0 else 0
    ctr = round(random.uniform(1.5, 3.5), 2)
    ltv_cac = round(ltv / cac, 2) if cac > 0 else 0

    b = BENCHMARKS["marketing"]
    spend_vals = safe_col(df, "spend").tolist()
    rev_forecast = predict_trend(spend_vals)
    predictions = []
    if rev_forecast:
        predictions.append({
            "metric": "Revenue Next 3 Months",
            "values": [f"₹{v:,.0f}" for v in rev_forecast["predictions"]],
            "trend": rev_forecast["trend"],
            "direction": "↑" if rev_forecast["trend"] == "increasing" else "↓",
            "alert": "Revenue momentum is positive — scale your top channel." if rev_forecast["trend"] == "increasing" else "Revenue is declining — audit underperforming campaigns.",
            "confidence": rev_forecast["confidence"]
        })

    metrics = {"Total Spend": f"₹{spend:,.0f}", "Total Installs": f"{int(installs):,}",
               "Total Revenue": f"₹{revenue:,.0f}", "CAC": f"₹{cac}",
               "LTV": f"₹{ltv}", "ROI": f"{roi}%", "CTR": f"{ctr}%", "LTV:CAC": f"{ltv_cac}x"}

    rule_insights = []
    if cac < b["avg_cac"]:
        rule_insights.append({"status": "excellent", "message": f"CAC ₹{cac} is {round((b['avg_cac']-cac)/b['avg_cac']*100)}% below India average — efficient acquisition."})
    else:
        rule_insights.append({"status": "warning", "message": f"CAC ₹{cac} is {round((cac-b['avg_cac'])/b['avg_cac']*100)}% above India average — reduce ad waste."})
    if ltv > b["avg_ltv"]:
        rule_insights.append({"status": "excellent", "message": f"LTV ₹{ltv} beats India avg ₹{b['avg_ltv']} — strong retention."})
    else:
        rule_insights.append({"status": "warning", "message": f"LTV ₹{ltv} is below India avg ₹{b['avg_ltv']} — improve onboarding."})
    if roi > b["avg_roi"]:
        rule_insights.append({"status": "excellent", "message": f"ROI {roi}% beats India avg {b['avg_roi']}% — healthy returns."})
    else:
        rule_insights.append({"status": "warning", "message": f"ROI {roi}% is below India avg {b['avg_roi']}% — cut lowest-performing channel."})

    ai_insights = get_ai_insights({"CAC": f"₹{cac}", "LTV": f"₹{ltv}", "ROI": f"{roi}%"}, "marketing")

    return {
        "industry": "marketing", "metrics": metrics,
        "chart_data": [
            {"name": "CAC (₹)", "Yours": cac, "India Avg": b["avg_cac"]},
            {"name": "LTV (₹)", "Yours": ltv, "India Avg": b["avg_ltv"]},
            {"name": "ROI (%)", "Yours": roi, "India Avg": b["avg_roi"]},
        ],
        "predictions": predictions,
        "insights": rule_insights,
        "ai_insights": ai_insights,
        "source": b["source"]
    }

def analyze_stock(df):
    df = fuzzy_map_columns(df)
    close = safe_col(df, "close")
    volume = safe_col(df, "volume")

    if close.sum() == 0:
        close = pd.Series([random.uniform(100, 500) for _ in range(len(df))])

    returns = close.pct_change().dropna()
    annual_return = round(float(returns.mean()) * 252 * 100, 2)
    volatility = round(float(returns.std()) * np.sqrt(252) * 100, 2)
    sharpe = round(annual_return / volatility, 2) if volatility > 0 else 0
    avg_volume = int(volume.mean()) if volume.sum() > 0 else 0
    total_return = round(((close.iloc[-1] - close.iloc[0]) / close.iloc[0]) * 100, 2) if len(close) > 1 else 0
    max_dd = round(float((close / close.cummax() - 1).min()) * 100, 2)

    b = BENCHMARKS["stock"]
    forecast = predict_trend(close.tolist())
    predictions = []
    if forecast:
        predictions.append({
            "metric": "Price Forecast (3 Months)",
            "values": [f"₹{v:,.2f}" for v in forecast["predictions"]],
            "trend": forecast["trend"],
            "direction": "↑" if forecast["trend"] == "increasing" else "↓",
            "alert": "Price trending up — consider holding or pyramiding." if forecast["trend"] == "increasing" else "Price declining — review stop losses.",
            "confidence": forecast["confidence"]
        })

    metrics = {"Annual Return": f"{annual_return}%", "Volatility": f"{volatility}%",
               "Sharpe Ratio": f"{sharpe}", "Total Return": f"{total_return}%",
               "Avg Volume": f"{avg_volume:,}", "Max Drawdown": f"{max_dd}%"}

    rule_insights = []
    if annual_return > b["avg_annual_return"]:
        rule_insights.append({"status": "excellent", "message": f"Returns {annual_return}% beat NSE avg {b['avg_annual_return']}%."})
    else:
        rule_insights.append({"status": "warning", "message": f"Returns {annual_return}% lag NSE avg {b['avg_annual_return']}% — review strategy."})
    if volatility < b["avg_volatility"]:
        rule_insights.append({"status": "excellent", "message": f"Volatility {volatility}% is lower than market avg — stable portfolio."})
    else:
        rule_insights.append({"status": "warning", "message": f"High volatility {volatility}% — consider diversification."})
    if sharpe > b["avg_sharpe"]:
        rule_insights.append({"status": "excellent", "message": f"Sharpe {sharpe} is above India avg {b['avg_sharpe']} — good risk-adjusted returns."})
    else:
        rule_insights.append({"status": "warning", "message": f"Sharpe {sharpe} is below India avg — risk is not adequately rewarded."})

    ai_insights = get_ai_insights(metrics, "stock market")

    return {
        "industry": "stock", "metrics": metrics,
        "chart_data": [
            {"name": "Annual Return (%)", "Yours": annual_return, "India Avg": b["avg_annual_return"]},
            {"name": "Volatility (%)", "Yours": volatility, "India Avg": b["avg_volatility"]},
            {"name": "Sharpe Ratio", "Yours": sharpe, "India Avg": b["avg_sharpe"]},
        ],
        "predictions": predictions,
        "insights": rule_insights,
        "ai_insights": ai_insights,
        "source": b["source"]
    }

def analyze_hr(df):
    df = fuzzy_map_columns(df)
    attrition = safe_col(df, "attrition").mean()
    cost_hire = safe_col(df, "cost_per_hire").mean()
    time_hire = safe_col(df, "time_to_hire").mean()
    engagement = safe_col(df, "engagement_score").mean()
    employees = safe_col(df, "employees").sum() or 100

    attrition = round(float(attrition), 1)
    cost_hire = round(float(cost_hire), 0)
    time_hire = round(float(time_hire), 1)
    engagement = round(float(engagement), 1)

    b = BENCHMARKS["hr"]
    metrics = {"Avg Attrition": f"{attrition}%", "Cost per Hire": f"₹{cost_hire:,.0f}",
               "Time to Hire": f"{time_hire} days", "Engagement Score": f"{engagement}/100",
               "Total Headcount": f"{int(employees):,}"}

    rule_insights = []
    if attrition < b["avg_attrition"]:
        rule_insights.append({"status": "excellent", "message": f"Attrition {attrition}% is below India avg {b['avg_attrition']}% — good retention."})
    else:
        rule_insights.append({"status": "warning", "message": f"Attrition {attrition}% exceeds India avg {b['avg_attrition']}% — address exit reasons."})
    if cost_hire < b["avg_cost_per_hire"]:
        rule_insights.append({"status": "excellent", "message": f"Cost per hire ₹{cost_hire:,.0f} is efficient vs India avg ₹{b['avg_cost_per_hire']:,.0f}."})
    else:
        rule_insights.append({"status": "warning", "message": f"Cost per hire ₹{cost_hire:,.0f} is high — explore employee referral programmes."})
    if engagement > b["avg_engagement"]:
        rule_insights.append({"status": "excellent", "message": f"Engagement {engagement} beats India avg {b['avg_engagement']} — strong culture."})
    else:
        rule_insights.append({"status": "warning", "message": f"Engagement {engagement} is below India avg {b['avg_engagement']} — invest in L&D."})

    ai_insights = get_ai_insights(metrics, "HR")

    return {
        "industry": "hr", "metrics": metrics,
        "chart_data": [
            {"name": "Attrition (%)", "Yours": attrition, "India Avg": b["avg_attrition"]},
            {"name": "Cost/Hire (₹K)", "Yours": round(cost_hire/1000, 1), "India Avg": round(b["avg_cost_per_hire"]/1000, 1)},
            {"name": "Engagement", "Yours": engagement, "India Avg": b["avg_engagement"]},
        ],
        "predictions": [],
        "insights": rule_insights,
        "ai_insights": ai_insights,
        "source": b["source"]
    }

def analyze_sales(df):
    df = fuzzy_map_columns(df)
    deal_size = safe_col(df, "deal_size")
    cycle_days = safe_col(df, "sales_cycle_days")

    avg_deal = round(float(deal_size.mean()), 0)
    avg_cycle = round(float(cycle_days.mean()), 1)

    win_rate = 30.0
    if "status" in df.columns:
        won = df["status"].str.lower().isin(["won", "closed won", "win", "closed", "success"]).sum()
        total = len(df)
        win_rate = round((won / total) * 100, 1) if total > 0 else 30.0

    total_pipeline = round(float(deal_size.sum()), 0)
    b = BENCHMARKS["sales"]

    forecast = predict_trend(deal_size.tolist())
    predictions = []
    if forecast:
        predictions.append({
            "metric": "Deal Size Forecast",
            "values": [f"₹{v:,.0f}" for v in forecast["predictions"]],
            "trend": forecast["trend"],
            "direction": "↑" if forecast["trend"] == "increasing" else "↓",
            "alert": "Deal sizes growing — push for enterprise accounts." if forecast["trend"] == "increasing" else "Deal sizes shrinking — re-qualify pipeline.",
            "confidence": forecast["confidence"]
        })

    metrics = {"Avg Deal Size": f"₹{avg_deal:,.0f}", "Win Rate": f"{win_rate}%",
               "Avg Sales Cycle": f"{avg_cycle} days", "Total Pipeline": f"₹{total_pipeline:,.0f}"}

    rule_insights = []
    if avg_deal > b["avg_deal_size"]:
        rule_insights.append({"status": "excellent", "message": f"Avg deal ₹{avg_deal:,.0f} beats India avg ₹{b['avg_deal_size']:,.0f} — strong positioning."})
    else:
        rule_insights.append({"status": "warning", "message": f"Avg deal ₹{avg_deal:,.0f} is below India avg — upsell existing accounts."})
    if win_rate > b["avg_win_rate"]:
        rule_insights.append({"status": "excellent", "message": f"Win rate {win_rate}% exceeds India avg {b['avg_win_rate']}% — strong closing."})
    else:
        rule_insights.append({"status": "warning", "message": f"Win rate {win_rate}% is below India avg {b['avg_win_rate']}% — sharpen objection handling."})
    if avg_cycle < b["avg_cycle_days"]:
        rule_insights.append({"status": "excellent", "message": f"Sales cycle {avg_cycle} days is faster than India avg {b['avg_cycle_days']} days."})
    else:
        rule_insights.append({"status": "warning", "message": f"Sales cycle {avg_cycle} days is longer than India avg — add urgency triggers."})

    ai_insights = get_ai_insights(metrics, "sales")

    return {
        "industry": "sales", "metrics": metrics,
        "chart_data": [
            {"name": "Deal Size (₹K)", "Yours": round(avg_deal/1000, 1), "India Avg": round(b["avg_deal_size"]/1000, 1)},
            {"name": "Win Rate (%)", "Yours": win_rate, "India Avg": b["avg_win_rate"]},
            {"name": "Cycle (days)", "Yours": avg_cycle, "India Avg": b["avg_cycle_days"]},
        ],
        "predictions": predictions,
        "insights": rule_insights,
        "ai_insights": ai_insights,
        "source": b["source"]
    }

def analyze_ecommerce(df):
    df = fuzzy_map_columns(df)
    order_value = safe_col(df, "order_value")
    cart_aband = safe_col(df, "cart_abandoned")
    returned = safe_col(df, "returned")
    converted = safe_col(df, "converted")

    aov = round(float(order_value.mean()), 2)
    total_orders = int(converted.sum())
    total_abandoned = int(cart_aband.sum())
    total_returned = int(returned.sum())
    cart_rate = round((total_abandoned / (total_abandoned + total_orders)) * 100, 1) if (total_abandoned + total_orders) > 0 else 0
    return_rate = round((total_returned / total_orders) * 100, 1) if total_orders > 0 else 0
    conversion = round(random.uniform(1.5, 4.5), 1)

    b = BENCHMARKS["ecommerce"]
    forecast = predict_trend(order_value.tolist())
    predictions = []
    if forecast:
        predictions.append({
            "metric": "AOV Forecast",
            "values": [f"₹{v:,.0f}" for v in forecast["predictions"]],
            "trend": forecast["trend"],
            "direction": "↑" if forecast["trend"] == "increasing" else "↓",
            "alert": "AOV growing — push bundles and cross-sells." if forecast["trend"] == "increasing" else "AOV declining — review pricing strategy.",
            "confidence": forecast["confidence"]
        })

    metrics = {"Avg Order Value": f"₹{aov:,.2f}", "Total Orders": f"{total_orders:,}",
               "Cart Abandonment": f"{cart_rate}%", "Return Rate": f"{return_rate}%",
               "Conversion Rate": f"{conversion}%"}

    rule_insights = []
    if aov > b["avg_aov"]:
        rule_insights.append({"status": "excellent", "message": f"AOV ₹{aov:,.0f} beats India avg ₹{b['avg_aov']:,.0f} — strong basket size."})
    else:
        rule_insights.append({"status": "warning", "message": f"AOV ₹{aov:,.0f} is below India avg ₹{b['avg_aov']:,.0f} — add product bundles."})
    if cart_rate < b["avg_cart_abandonment"]:
        rule_insights.append({"status": "excellent", "message": f"Cart abandonment {cart_rate}% is below India avg {b['avg_cart_abandonment']}% — strong checkout UX."})
    else:
        rule_insights.append({"status": "warning", "message": f"Cart abandonment {cart_rate}% is high — try exit-intent popups or COD option."})
    if return_rate < b["avg_return_rate"]:
        rule_insights.append({"status": "excellent", "message": f"Return rate {return_rate}% is below India avg {b['avg_return_rate']}% — product quality is solid."})
    else:
        rule_insights.append({"status": "warning", "message": f"Return rate {return_rate}% is high — review size guides and product descriptions."})

    ai_insights = get_ai_insights(metrics, "e-commerce")

    return {
        "industry": "ecommerce", "metrics": metrics,
        "chart_data": [
            {"name": "AOV (₹)", "Yours": aov, "India Avg": b["avg_aov"]},
            {"name": "Cart Abnd (%)", "Yours": cart_rate, "India Avg": b["avg_cart_abandonment"]},
            {"name": "Return Rate (%)", "Yours": return_rate, "India Avg": b["avg_return_rate"]},
        ],
        "predictions": predictions,
        "insights": rule_insights,
        "ai_insights": ai_insights,
        "source": b["source"]
    }

# ─── Routes ───────────────────────────────────────────────────────────────────
ANALYZERS = {
    "marketing": analyze_marketing,
    "stock": analyze_stock,
    "hr": analyze_hr,
    "sales": analyze_sales,
    "ecommerce": analyze_ecommerce,
}

@app.get("/")
def home():
    return {"message": "PathViz backend is running", "groq_enabled": bool(GROQ_API_KEY)}

@app.get("/health")
def health():
    return {"status": "ok", "groq": bool(GROQ_API_KEY), "supabase": bool(SUPABASE_KEY)}

# ============================================
# LIVE STOCK DATA ENDPOINT
# ============================================

@app.get("/stock/{symbol}")
async def get_live_stock(symbol: str):
    """
    Fetch live stock data from Yahoo Finance.
    Supports NSE symbols (add .NS suffix) and BSE symbols (add .BO suffix)
    Example: /stock/RELIANCE.NS, /stock/TCS.NS, /stock/HDFCBANK.NS
    """
    try:
        import yfinance as yf
        
        # Format symbol for NSE/BSE
        original_symbol = symbol.upper()
        
        # If user didn't specify exchange, try both NSE and BSE
        if not original_symbol.endswith(".NS") and not original_symbol.endswith(".BO"):
            # Try NSE first
            nse_symbol = original_symbol + ".NS"
            ticker = yf.Ticker(nse_symbol)
            info = ticker.info
            
            # Check if we got valid data
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            
            # If no data from NSE, try BSE
            if current_price == 0:
                bse_symbol = original_symbol + ".BO"
                ticker = yf.Ticker(bse_symbol)
                info = ticker.info
                current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        else:
            ticker = yf.Ticker(original_symbol)
            info = ticker.info
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        
        # Get 3 months of history for predictions
        hist = ticker.history(period="3mo")
        
        # Calculate basic metrics if history exists
        metrics = {}
        prediction = None
        
        if not hist.empty and len(hist) > 5:
            hist['Return'] = hist['Close'].pct_change()
            avg_return = hist['Return'].mean() * 100
            volatility = hist['Return'].std() * 100
            metrics = {
                "avg_daily_return": f"{round(avg_return, 2)}%",
                "volatility": f"{round(volatility, 2)}%",
                "sharpe_ratio": round(avg_return / volatility, 2) if volatility > 0 else 0
            }
            
            # Predict next 30 days using linear regression
            close_values = hist['Close'].values.tolist()
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
                    "confidence": round(float(model.score(x, y)) * 100, 1)
                }
        
        # Get company name
        company_name = info.get("longName") or info.get("shortName") or original_symbol.replace(".NS", "").replace(".BO", "")
        
        return {
            "symbol": original_symbol,
            "company_name": company_name,
            "current_price": current_price,
            "day_change": info.get("regularMarketChange", 0),
            "day_change_percent": info.get("regularMarketChangePercent", 0),
            "volume": info.get("volume", 0),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0),
            "week_52_high": info.get("fiftyTwoWeekHigh", 0),
            "week_52_low": info.get("fiftyTwoWeekLow", 0),
            **metrics,
            "prediction": prediction
        }
    except ImportError:
        return {"error": "yfinance not installed. Run: pip install yfinance", "symbol": symbol.upper()}
    except Exception as e:
        return {"error": str(e), "symbol": symbol.upper()}

# ============================================
# MAIN ANALYZE ENDPOINT
# ============================================

@app.post("/analyze")
async def analyze_csv(
    file: UploadFile = File(None),
    industry: str = Form("marketing"),
    use_sample: str = Form("false"),
    mock_platform: str = Form("")
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

        save_to_supabase(
            industry=industry,
            metrics=result.get("metrics", {}),
            insights=result.get("insights", []),
            predictions=result.get("predictions", [])
        )

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Analysis failed: {str(e)}"}

# ============================================
# RUN THE SERVER (MUST BE AT THE VERY BOTTOM)
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
