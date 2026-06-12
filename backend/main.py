from fastapi import FastAPI, UploadFile, File, Form
import os
import requests

SUPABASE_URL = "https://fydfhzulozwjncbnmmwa.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZGZoenVsb3p3am5jYm5tbXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDY3NTcsImV4cCI6MjA5NTQyMjc1N30.6JCeGDkmhMWBph02qK3_EgxjBjHfE43_MsXlrCTmLqo"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
import random
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression

app = FastAPI()

def save_to_supabase(industry: str, metrics: dict, insights: list, predictions: dict):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/analyses",
            headers=SUPABASE_HEADERS,
            json={
                "industry": industry, 
                "metrics": metrics, 
                "insights": insights,
                "predictions": predictions
            }
        )
        if response.status_code == 201:
            print(f"✅ Saved to Supabase: {industry}")
        else:
            print(f"⚠️ Supabase returned {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Supabase save error: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://pathviz-app.vercel.app",
        "https://pathviz.vercel.app",
        "https://pathviz-production.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
BENCHMARKS = {
    "marketing": {
        "avg_cac": 85.00,
        "avg_ltv": 210.00,
        "avg_roi": 85.00,
        "avg_ctr": 2.50,
        "avg_churn": 15.00,
        "source": "AppsFlyer India Report 2024"
    },
    "stock": {
        "avg_return": 12.00,
        "avg_volatility": 18.00,
        "avg_sharpe": 1.20,
        "avg_win_rate": 55.00,
        "source": "NSE India Historical Data 2024"
    },
    "hr": {
        "avg_attrition": 18.00,
        "avg_cost_per_hire": 45000.00,
        "avg_time_to_hire": 32.00,
        "avg_engagement": 65.00,
        "source": "SHRM India HR Benchmarks 2024"
    },
    "sales": {
        "avg_conversion": 3.50,
        "avg_deal_size": 85000.00,
        "avg_sales_cycle": 45.00,
        "avg_win_rate": 25.00,
        "source": "Salesforce India SMB Report 2024"
    },
    "ecommerce": {
        "avg_conversion": 2.50,
        "avg_aov": 1200.00,
        "avg_cart_abandonment": 70.00,
        "avg_return_rate": 12.00,
        "source": "Unicommerce India E-commerce Report 2024"
    }
}

def predict_trend(values, periods_ahead=3):
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
        "slope": round(float(slope), 2),
        "trend": "increasing" if slope > 0 else "decreasing",
        "confidence": round(float(r_squared) * 100, 1)
    }

def generate_sample_data(industry):
    if industry == "marketing":
        rows = []
        campaigns = ["Google Ads", "Meta Ads", "Instagram", "YouTube", "Organic"]
        for i, c in enumerate(campaigns):
            spend = random.randint(3000, 9000)
            installs = random.randint(100, 400)
            revenue = spend * random.uniform(1.5, 3.0)
            active_users = int(installs * random.uniform(0.6, 0.9))
            clicks = random.randint(500, 3000)
            impressions = random.randint(10000, 100000)
            rows.append({
                "campaign": c,
                "month": i + 1,
                "spend": spend,
                "installs": installs,
                "revenue": round(revenue, 2),
                "active_users": active_users,
                "clicks": clicks,
                "impressions": impressions
            })
        return pd.DataFrame(rows)

    elif industry == "stock":
        rows = []
        price = 450.0
        date = datetime(2023, 1, 1)
        for i in range(252):
            change = random.uniform(-0.025, 0.028)
            price = price * (1 + change)
            rows.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": round(price, 2),
                "high": round(price * random.uniform(1.001, 1.02), 2),
                "low": round(price * random.uniform(0.98, 0.999), 2),
                "open": round(price * random.uniform(0.99, 1.01), 2),
                "volume": random.randint(500000, 3000000)
            })
            date += timedelta(days=1)
        return pd.DataFrame(rows)

    elif industry == "hr":
        rows = []
        departments = ["Engineering", "Sales", "Marketing", "Operations", "Finance"]
        for d in departments:
            rows.append({
                "department": d,
                "employees": random.randint(50, 300),
                "attrition": round(random.uniform(8, 28), 1),
                "cost_per_hire": random.randint(25000, 75000),
                "time_to_hire": random.randint(20, 50),
                "engagement_score": random.randint(55, 85)
            })
        return pd.DataFrame(rows)

    elif industry == "sales":
        rows = []
        statuses = ["won"] * 6 + ["lost"] * 4
        for i in range(50):
            rows.append({
                "deal_name": f"Deal {i+1}",
                "deal_size": random.randint(40000, 200000),
                "status": random.choice(statuses),
                "sales_cycle_days": random.randint(20, 90),
                "sales_rep": f"Rep {random.randint(1, 8)}"
            })
        return pd.DataFrame(rows)

    elif industry == "ecommerce":
        rows = []
        for i in range(100):
            rows.append({
                "order_id": f"ORD{1000+i}",
                "order_value": random.randint(400, 4500),
                "cart_abandoned": random.choice([0, 0, 0, 1]),
                "returned": random.choice([0, 0, 0, 0, 0, 1]),
                "converted": random.choice([1, 1, 1, 0])
            })
        return pd.DataFrame(rows)

def generate_mock_api_data(platform, industry):
    if platform == "google_ads":
        rows = []
        campaigns = ["Brand Search", "Generic Search", "Display", "YouTube", "Shopping"]
        for i, c in enumerate(campaigns):
            spend = random.randint(5000, 15000)
            clicks = random.randint(200, 1500)
            impressions = random.randint(10000, 150000)
            installs = random.randint(50, 300)
            revenue = spend * random.uniform(1.8, 3.5)
            rows.append({
                "campaign": c,
                "month": i + 1,
                "spend": spend,
                "clicks": clicks,
                "impressions": impressions,
                "installs": installs,
                "revenue": round(revenue, 2),
                "active_users": int(installs * 0.75)
            })
        return pd.DataFrame(rows)

    elif platform == "meta_ads":
        rows = []
        adsets = ["Lookalike 1%", "Interest - Tech", "Retargeting", "Broad", "Instagram Stories"]
        for i, a in enumerate(adsets):
            spend = random.randint(3000, 12000)
            clicks = random.randint(150, 1200)
            impressions = random.randint(8000, 120000)
            installs = random.randint(40, 250)
            revenue = spend * random.uniform(1.5, 3.0)
            rows.append({
                "campaign": a,
                "month": i + 1,
                "spend": spend,
                "clicks": clicks,
                "impressions": impressions,
                "installs": installs,
                "revenue": round(revenue, 2),
                "active_users": int(installs * 0.72)
            })
        return pd.DataFrame(rows)

    elif platform == "hubspot":
        rows = []
        campaigns = ["Email Campaign", "LinkedIn Ads", "Webinar", "Cold Outreach", "Partner Referral"]
        for i, c in enumerate(campaigns):
            spend = random.randint(4000, 11000)
            installs = random.randint(80, 300)
            revenue = spend * random.uniform(1.6, 3.2)
            rows.append({
                "campaign": c,
                "month": i + 1,
                "spend": spend,
                "installs": installs,
                "revenue": round(revenue, 2),
                "active_users": int(installs * 0.73),
                "clicks": random.randint(300, 1400),
                "impressions": random.randint(9000, 110000)
            })
        return pd.DataFrame(rows)

def analyze_marketing(df):
    df.columns = df.columns.str.lower().str.strip()
    total_spend = float(df["spend"].sum())
    total_installs = int(df["installs"].sum())
    total_revenue = float(df["revenue"].sum())
    active_users = float(df["active_users"].sum())
    clicks = float(df["clicks"].sum()) if "clicks" in df.columns else 0
    impressions = float(df["impressions"].sum()) if "impressions" in df.columns else 0

    cac = round(total_spend / total_installs, 2) if total_installs > 0 else 0
    ltv = round(total_revenue / active_users, 2) if active_users > 0 else 0
    roi = round(((total_revenue - total_spend) / total_spend) * 100, 2) if total_spend > 0 else 0
    ctr = round((clicks / impressions) * 100, 2) if impressions > 0 else 0
    ltv_cac_ratio = round(ltv / cac, 2) if cac > 0 else 0

    spend_values = df["spend"].tolist()
    revenue_values = df["revenue"].tolist()
    installs_values = df["installs"].tolist()

    cac_per_row = [round(s/i, 2) for s, i in zip(spend_values, installs_values) if i > 0]
    ltv_per_row = [round(r/a, 2) for r, a in zip(revenue_values, df["active_users"].tolist()) if a > 0]

    cac_forecast = predict_trend(cac_per_row) if len(cac_per_row) >= 2 else None
    ltv_forecast = predict_trend(ltv_per_row) if len(ltv_per_row) >= 2 else None
    revenue_forecast = predict_trend(revenue_values) if len(revenue_values) >= 2 else None

    b = BENCHMARKS["marketing"]
    insights = []

    if cac < b["avg_cac"]:
        insights.append({"status": "excellent", "message": f"✅ Your CAC (₹{cac}) is {round(((b['avg_cac']-cac)/b['avg_cac'])*100)}% lower than India average (₹{b['avg_cac']}). Excellent acquisition efficiency."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Your CAC (₹{cac}) is {round(((cac-b['avg_cac'])/b['avg_cac'])*100)}% higher than India average (₹{b['avg_cac']}). Optimise your targeting."})

    if ltv > b["avg_ltv"]:
        insights.append({"status": "excellent", "message": f"✅ Your LTV (₹{ltv}) is above India average (₹{b['avg_ltv']}). Your users are highly valuable."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Your LTV (₹{ltv}) is below India average (₹{b['avg_ltv']}). Focus on user retention."})

    if roi > b["avg_roi"]:
        insights.append({"status": "excellent", "message": f"✅ Your ROI ({roi}%) beats India average ({b['avg_roi']}%). Strong campaign performance."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Your ROI ({roi}%) is below India average ({b['avg_roi']}%). Review spend allocation."})

    predictions = []
    if cac_forecast:
        direction = "↑" if cac_forecast["trend"] == "increasing" else "↓"
        alert = "⚠️ CAC is rising — review targeting" if cac_forecast["trend"] == "increasing" else "✅ CAC is improving"
        predictions.append({
            "metric": "CAC Next 3 Months",
            "values": [f"₹{v}" for v in cac_forecast["predictions"]],
            "trend": cac_forecast["trend"],
            "direction": direction,
            "alert": alert,
            "confidence": cac_forecast["confidence"]
        })

    if revenue_forecast:
        direction = "↑" if revenue_forecast["trend"] == "increasing" else "↓"
        alert = "✅ Revenue is growing" if revenue_forecast["trend"] == "increasing" else "⚠️ Revenue is declining — act now"
        predictions.append({
            "metric": "Revenue Next 3 Months",
            "values": [f"₹{v:,.0f}" for v in revenue_forecast["predictions"]],
            "trend": revenue_forecast["trend"],
            "direction": direction,
            "alert": alert,
            "confidence": revenue_forecast["confidence"]
        })

    return {
        "industry": "marketing",
        "metrics": {
            "Total Spend": f"₹{total_spend:,.2f}",
            "Total Installs": f"{total_installs:,}",
            "Total Revenue": f"₹{total_revenue:,.2f}",
            "CAC": f"₹{cac}",
            "LTV": f"₹{ltv}",
            "ROI": f"{roi}%",
            "CTR": f"{ctr}%",
            "LTV:CAC Ratio": f"{ltv_cac_ratio}x"
        },
        "chart_data": [
            {"name": "CAC", "Yours": cac, "India Avg": b["avg_cac"]},
            {"name": "LTV", "Yours": ltv, "India Avg": b["avg_ltv"]},
            {"name": "ROI", "Yours": roi, "India Avg": b["avg_roi"]},
        ],
        "predictions": predictions,
        "insights": insights,
        "source": b["source"]
    }

def analyze_stock(df):
    df.columns = df.columns.str.lower().str.strip()
    df["return"] = df["close"].pct_change() * 100
    avg_return = round(df["return"].mean(), 2)
    volatility = round(df["return"].std(), 2)
    sharpe = round(avg_return / volatility, 2) if volatility > 0 else 0
    win_rate = round((df["return"] > 0).mean() * 100, 2)
    total_return = round(((df["close"].iloc[-1] - df["close"].iloc[0]) / df["close"].iloc[0]) * 100, 2)
    max_drawdown = round(((df["close"].cummax() - df["close"]) / df["close"].cummax()).max() * 100, 2)

    close_values = df["close"].tolist()
    price_forecast = predict_trend(close_values[-30:])

    b = BENCHMARKS["stock"]
    insights = []

    if avg_return > 0:
        insights.append({"status": "excellent", "message": f"✅ Positive average daily return ({avg_return}%). Stock shows upward momentum."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Negative average return ({avg_return}%). Review portfolio allocation."})

    if sharpe > b["avg_sharpe"]:
        insights.append({"status": "excellent", "message": f"✅ Sharpe ratio ({sharpe}) beats benchmark ({b['avg_sharpe']}). Good risk-adjusted returns."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Sharpe ratio ({sharpe}) is below benchmark ({b['avg_sharpe']}). Risk may not be worth the return."})

    if win_rate > b["avg_win_rate"]:
        insights.append({"status": "excellent", "message": f"✅ Win rate ({win_rate}%) beats benchmark ({b['avg_win_rate']}%). More winning days than average."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Win rate ({win_rate}%) is below benchmark ({b['avg_win_rate']}%). More losing days than average."})

    predictions = []
    if price_forecast:
        direction = "↑" if price_forecast["trend"] == "increasing" else "↓"
        alert = "✅ Price trend is bullish" if price_forecast["trend"] == "increasing" else "⚠️ Price trend is bearish — consider risk management"
        predictions.append({
            "metric": "Price Next 3 Periods",
            "values": [f"₹{v:,.2f}" for v in price_forecast["predictions"]],
            "trend": price_forecast["trend"],
            "direction": direction,
            "alert": alert,
            "confidence": price_forecast["confidence"]
        })

    return {
        "industry": "stock",
        "metrics": {
            "Total Return": f"{total_return}%",
            "Avg Daily Return": f"{avg_return}%",
            "Volatility": f"{volatility}%",
            "Sharpe Ratio": f"{sharpe}",
            "Win Rate": f"{win_rate}%",
            "Max Drawdown": f"{max_drawdown}%"
        },
        "chart_data": [
            {"name": "Avg Return", "Yours": avg_return, "Benchmark": b["avg_return"] / 252},
            {"name": "Sharpe Ratio", "Yours": sharpe, "Benchmark": b["avg_sharpe"]},
            {"name": "Win Rate", "Yours": win_rate, "Benchmark": b["avg_win_rate"]},
        ],
        "predictions": predictions,
        "insights": insights,
        "source": b["source"]
    }

def analyze_hr(df):
    df.columns = df.columns.str.lower().str.strip()
    total_employees = int(df["employees"].sum()) if "employees" in df.columns else int(df.shape[0])
    attrition = round(float(df["attrition"].mean()), 2) if "attrition" in df.columns else 0
    cost_per_hire = round(float(df["cost_per_hire"].mean()), 2) if "cost_per_hire" in df.columns else 0
    time_to_hire = round(float(df["time_to_hire"].mean()), 2) if "time_to_hire" in df.columns else 0
    engagement = round(float(df["engagement_score"].mean()), 2) if "engagement_score" in df.columns else 0

    attrition_values = df["attrition"].tolist() if "attrition" in df.columns else []
    attrition_forecast = predict_trend(attrition_values) if len(attrition_values) >= 2 else None

    b = BENCHMARKS["hr"]
    insights = []

    if attrition < b["avg_attrition"]:
        insights.append({"status": "excellent", "message": f"✅ Attrition rate ({attrition}%) is below India average ({b['avg_attrition']}%). Strong employee retention."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Attrition rate ({attrition}%) is above India average ({b['avg_attrition']}%). Review retention strategy."})

    if cost_per_hire < b["avg_cost_per_hire"]:
        insights.append({"status": "excellent", "message": f"✅ Cost per hire (₹{cost_per_hire}) is below India average (₹{b['avg_cost_per_hire']}). Efficient recruitment."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Cost per hire (₹{cost_per_hire}) is above India average (₹{b['avg_cost_per_hire']}). Optimise recruitment channels."})

    if engagement > b["avg_engagement"]:
        insights.append({"status": "excellent", "message": f"✅ Engagement score ({engagement}) beats India average ({b['avg_engagement']}%). Highly engaged workforce."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Engagement score ({engagement}) is below India average ({b['avg_engagement']}%). Focus on employee experience."})

    predictions = []
    if attrition_forecast:
        direction = "↑" if attrition_forecast["trend"] == "increasing" else "↓"
        alert = "⚠️ Attrition is rising — review retention strategy urgently" if attrition_forecast["trend"] == "increasing" else "✅ Attrition is improving"
        predictions.append({
            "metric": "Attrition Next 3 Quarters",
            "values": [f"{v}%" for v in attrition_forecast["predictions"]],
            "trend": attrition_forecast["trend"],
            "direction": direction,
            "alert": alert,
            "confidence": attrition_forecast["confidence"]
        })

    return {
        "industry": "hr",
        "metrics": {
            "Total Employees": f"{total_employees:,}",
            "Attrition Rate": f"{attrition}%",
            "Cost Per Hire": f"₹{cost_per_hire:,.0f}",
            "Time to Hire": f"{time_to_hire} days",
            "Engagement Score": f"{engagement}/100"
        },
        "chart_data": [
            {"name": "Attrition %", "Yours": attrition, "India Avg": b["avg_attrition"]},
            {"name": "Time to Hire", "Yours": time_to_hire, "India Avg": b["avg_time_to_hire"]},
            {"name": "Engagement", "Yours": engagement, "India Avg": b["avg_engagement"]},
        ],
        "predictions": predictions,
        "insights": insights,
        "source": b["source"]
    }

def analyze_sales(df):
    df.columns = df.columns.str.lower().str.strip()
    total_deals = int(df.shape[0])
    won_deals = int(df[df["status"] == "won"].shape[0]) if "status" in df.columns else 0
    conversion_rate = round((won_deals / total_deals) * 100, 2) if total_deals > 0 else 0
    avg_deal_size = round(float(df["deal_size"].mean()), 2) if "deal_size" in df.columns else 0
    total_revenue = round(float(df["deal_size"].sum()), 2) if "deal_size" in df.columns else 0
    avg_sales_cycle = round(float(df["sales_cycle_days"].mean()), 2) if "sales_cycle_days" in df.columns else 0

    deal_values = df["deal_size"].tolist() if "deal_size" in df.columns else []
    revenue_forecast = predict_trend(deal_values[-10:]) if len(deal_values) >= 2 else None

    b = BENCHMARKS["sales"]
    insights = []

    if conversion_rate > b["avg_conversion"]:
        insights.append({"status": "excellent", "message": f"✅ Conversion rate ({conversion_rate}%) beats India average ({b['avg_conversion']}%). Strong sales performance."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Conversion rate ({conversion_rate}%) is below India average ({b['avg_conversion']}%). Review sales process."})

    if avg_deal_size > b["avg_deal_size"]:
        insights.append({"status": "excellent", "message": f"✅ Average deal size (₹{avg_deal_size:,.0f}) exceeds India average (₹{b['avg_deal_size']:,.0f}). Premium positioning working."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Average deal size (₹{avg_deal_size:,.0f}) is below India average (₹{b['avg_deal_size']:,.0f}). Consider upselling strategies."})

    if avg_sales_cycle < b["avg_sales_cycle"]:
        insights.append({"status": "excellent", "message": f"✅ Sales cycle ({avg_sales_cycle} days) is faster than India average ({b['avg_sales_cycle']} days). Efficient sales process."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Sales cycle ({avg_sales_cycle} days) is slower than India average ({b['avg_sales_cycle']} days). Identify bottlenecks."})

    predictions = []
    if revenue_forecast:
        direction = "↑" if revenue_forecast["trend"] == "increasing" else "↓"
        alert = "✅ Deal sizes are growing" if revenue_forecast["trend"] == "increasing" else "⚠️ Deal sizes are shrinking — review pricing strategy"
        predictions.append({
            "metric": "Deal Size Next 3 Months",
            "values": [f"₹{v:,.0f}" for v in revenue_forecast["predictions"]],
            "trend": revenue_forecast["trend"],
            "direction": direction,
            "alert": alert,
            "confidence": revenue_forecast["confidence"]
        })

    return {
        "industry": "sales",
        "metrics": {
            "Total Deals": f"{total_deals:,}",
            "Won Deals": f"{won_deals:,}",
            "Conversion Rate": f"{conversion_rate}%",
            "Avg Deal Size": f"₹{avg_deal_size:,.0f}",
            "Total Revenue": f"₹{total_revenue:,.0f}",
            "Avg Sales Cycle": f"{avg_sales_cycle} days"
        },
        "chart_data": [
            {"name": "Conversion %", "Yours": conversion_rate, "India Avg": b["avg_conversion"]},
            {"name": "Win Rate", "Yours": conversion_rate, "India Avg": b["avg_win_rate"]},
            {"name": "Sales Cycle", "Yours": avg_sales_cycle, "India Avg": b["avg_sales_cycle"]},
        ],
        "predictions": predictions,
        "insights": insights,
        "source": b["source"]
    }

def analyze_ecommerce(df):
    df.columns = df.columns.str.lower().str.strip()
    total_orders = int(df.shape[0])
    total_revenue = round(float(df["order_value"].sum()), 2) if "order_value" in df.columns else 0
    avg_order_value = round(float(df["order_value"].mean()), 2) if "order_value" in df.columns else 0
    cart_abandonment = round(float(df["cart_abandoned"].mean()) * 100, 2) if "cart_abandoned" in df.columns else 0
    return_rate = round((df[df["returned"] == 1].shape[0] / total_orders) * 100, 2) if "returned" in df.columns else 0
    conversion_rate = round(float(df["converted"].mean()) * 100, 2) if "converted" in df.columns else 0

    order_values = df["order_value"].tolist() if "order_value" in df.columns else []
    aov_forecast = predict_trend(order_values[-20:]) if len(order_values) >= 2 else None

    b = BENCHMARKS["ecommerce"]
    insights = []

    if avg_order_value > b["avg_aov"]:
        insights.append({"status": "excellent", "message": f"✅ Average order value (₹{avg_order_value}) exceeds India average (₹{b['avg_aov']}). Strong basket size."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Average order value (₹{avg_order_value}) is below India average (₹{b['avg_aov']}). Consider bundling or upsells."})

    if cart_abandonment < b["avg_cart_abandonment"]:
        insights.append({"status": "excellent", "message": f"✅ Cart abandonment ({cart_abandonment}%) is below India average ({b['avg_cart_abandonment']}%). Good checkout experience."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Cart abandonment ({cart_abandonment}%) is above India average ({b['avg_cart_abandonment']}%). Simplify checkout."})

    if return_rate < b["avg_return_rate"]:
        insights.append({"status": "excellent", "message": f"✅ Return rate ({return_rate}%) is below India average ({b['avg_return_rate']}%). Product quality is strong."})
    else:
        insights.append({"status": "warning", "message": f"⚠️ Return rate ({return_rate}%) is above India average ({b['avg_return_rate']}%). Review product descriptions."})

    predictions = []
    if aov_forecast:
        direction = "↑" if aov_forecast["trend"] == "increasing" else "↓"
        alert = "✅ Order values are growing" if aov_forecast["trend"] == "increasing" else "⚠️ Order values are declining — review pricing"
        predictions.append({
            "metric": "Avg Order Value Next 3 Months",
            "values": [f"₹{v:,.0f}" for v in aov_forecast["predictions"]],
            "trend": aov_forecast["trend"],
            "direction": direction,
            "alert": alert,
            "confidence": aov_forecast["confidence"]
        })

    return {
        "industry": "ecommerce",
        "metrics": {
            "Total Orders": f"{total_orders:,}",
            "Total Revenue": f"₹{total_revenue:,.0f}",
            "Avg Order Value": f"₹{avg_order_value:,.0f}",
            "Conversion Rate": f"{conversion_rate}%",
            "Cart Abandonment": f"{cart_abandonment}%",
            "Return Rate": f"{return_rate}%"
        },
        "chart_data": [
            {"name": "Conversion %", "Yours": conversion_rate, "India Avg": b["avg_conversion"]},
            {"name": "Cart Abandon %", "Yours": cart_abandonment, "India Avg": b["avg_cart_abandonment"]},
            {"name": "Return Rate %", "Yours": return_rate, "India Avg": b["avg_return_rate"]},
        ],
        "predictions": predictions,
        "insights": insights,
        "source": b["source"]
    }

@app.get("/")
def home():
    return {"message": "Pathviz backend is running"}

@app.get("/benchmarks/{industry}")
def get_benchmarks(industry: str):
    return BENCHMARKS.get(industry, {})

@app.get("/sample/{industry}")
def get_sample_data(industry: str):
    df = generate_sample_data(industry)
    return {"data": df.to_dict(orient="records"), "columns": list(df.columns)}

@app.get("/mock-api/{platform}")
def get_mock_api_data(platform: str):
    df = generate_mock_api_data(platform, "marketing")
    return {"data": df.to_dict(orient="records"), "columns": list(df.columns), "platform": platform}

@app.post("/analyze")
async def analyze_csv(
    file: UploadFile = File(None),
    industry: str = Form("marketing"),
    use_sample: str = Form("false"),
    mock_platform: str = Form("")
):
    if use_sample == "true":
        df = generate_sample_data(industry)
    elif mock_platform:
        df = generate_mock_api_data(mock_platform, industry)
    else:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))

    if industry == "marketing":
        result = analyze_marketing(df)
    elif industry == "stock":
        result = analyze_stock(df)
    elif industry == "hr":
        result = analyze_hr(df)
    elif industry == "sales":
        result = analyze_sales(df)
    elif industry == "ecommerce":
        result = analyze_ecommerce(df)
    else:
        result = analyze_marketing(df)

    # Save to Supabase
    save_to_supabase(
        industry=industry,
        metrics=result.get("metrics", result),
        insights=result.get("insights", []),
        predictions=result.get("predictions", {})
    )

    return result