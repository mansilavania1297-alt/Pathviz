import React, { useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap";
document.head.appendChild(fontLink);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const INDUSTRIES = [
  { id: "marketing",  label: "Marketing",    sub: "CAC · LTV · ROI",              columns: "spend, installs, revenue, active_users" },
  { id: "stock",      label: "Stock Market", sub: "Returns · Sharpe · Volatility", columns: "date, close, volume" },
  { id: "research",   label: "Research",     sub: "h-index · Citations · IF",      columns: "papers, citations, impact_factor" },
  { id: "medical",    label: "Medical",      sub: "Outcomes · Readmission · Cost", columns: "patients, readmissions, treatment_cost" },
  { id: "fintech",    label: "FinTech",      sub: "Transactions · Loans · NPD",    columns: "transactions, loan_amount, default_rate" },
  { id: "hr",         label: "HR",           sub: "Attrition · Hire Cost · ENG",   columns: "employees, attrition, cost_per_hire, time_to_hire, engagement_score" },
  { id: "sales",      label: "Sales",        sub: "Deal Size · Win Rate · Cycle",  columns: "deal_size, status, sales_cycle_days" },
  { id: "ecommerce",  label: "E-commerce",   sub: "AOV · Abandon · Returns",       columns: "order_value, cart_abandoned, returned, converted" },
];

const MOCK_APIS = [
  { id: "google_ads", label: "Google Ads", color: "#4285f4" },
  { id: "meta_ads",   label: "Meta Ads",   color: "#1877f2" },
  { id: "hubspot",    label: "HubSpot",    color: "#ff7a59" },
];

/* ─── SVG Icons ─────────────────────────────────────────────────────────────── */
const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const StockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);
const TrendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/* ─── Skeleton ──────────────────────────────────────────────────────────────── */
function Skeleton({ w = "100%", h = 20, radius = 6, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, marginBottom: mb,
      background: "linear-gradient(90deg,#1c1c1c 25%,#252525 50%,#1c1c1c 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}

/* ─── Custom chart tooltip ──────────────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#181818", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#666", fontSize: 10, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, margin: "2px 0" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── Metric explanation helper ─────────────────────────────────────────────── */
function explainMetric(key, value) {
  const raw = String(value).replace(/[₹%,]/g, "").trim();
  const num = parseFloat(raw);
  const map = {
    "CAC": num < 85
      ? `Below India's ₹85 average — your customer acquisition spend is efficient.`
      : `Above India's ₹85 average. Invest in organic or referral channels to bring this down.`,
    "LTV": num > 210
      ? `Above the ₹210 India benchmark — strong retention and repeat purchase behaviour.`
      : `Below ₹210 benchmark. Upsell flows, subscriptions, or loyalty programs can raise this.`,
    "ROI": num > 85
      ? `Outperforming India's 85% marketing ROI average — campaigns are working.`
      : `Below 85% benchmark. Reallocate budget away from underperforming channels.`,
    "Attrition Rate": num < 18
      ? `Below India's 18% attrition average — healthy team retention.`
      : `Above average. Exit interview data and manager effectiveness reviews are a good starting point.`,
    "Win Rate": num > 30
      ? `Above India's 30% win rate — strong sales process.`
      : `Below 30% benchmark. Review deal qualification criteria and objection handling scripts.`,
    "Readmission Rate": num < 15
      ? `Below India's 15% benchmark — strong post-discharge protocols.`
      : `Above average. Discharge planning and 7-day follow-up calls can reduce this significantly.`,
    "Default Rate": num < 8.5
      ? `Below the 8.5% industry norm — credit risk is well managed.`
      : `Above benchmark. Tighten underwriting criteria or improve early collections touchpoints.`,
    "h-index": num > 15
      ? `Above India's average h-index of 15 — strong research impact.`
      : `Below average. Focus on high-citation journals and collaborative cross-institutional research.`,
  };
  return map[key] || null;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [industry, setIndustry]         = useState("marketing");
  const [file, setFile]                 = useState(null);
  const [results, setResults]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState("analyze");
  const [stockSymbol, setStockSymbol]   = useState("RELIANCE.NS");
  const [stockData, setStockData]       = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [trendKeyword, setTrendKeyword] = useState("");
  const [trendData, setTrendData]       = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const sel = INDUSTRIES.find(i => i.id === industry);

  const handleAnalyze = async (source = "upload", platform = "") => {
    setLoading(true); setError(null); setResults(null);
    const fd = new FormData();
    fd.append("industry", industry);
    if (source === "sample") {
      fd.append("use_sample", "true");
      fd.append("file", new Blob(["x"]), "placeholder.csv");
    } else if (source === "mock_api") {
      fd.append("mock_platform", platform);
      fd.append("file", new Blob(["x"]), "placeholder.csv");
    } else {
      if (!file) { setError("Select a CSV or Excel file first."); setLoading(false); return; }
      fd.append("file", file);
    }
    try {
      const res = await axios.post(`${API_URL}/analyze`, fd);
      if (res.data.error) setError(res.data.error);
      else setResults(res.data);
    } catch { setError("Could not reach the analysis server. Check your connection and try again."); }
    setLoading(false);
  };

  const handleStock = async () => {
    setStockLoading(true); setError(null); setStockData(null);
    try {
      const res = await axios.get(`${API_URL}/stock/${stockSymbol}`);
      if (res.data.error) setError(res.data.error);
      else setStockData(res.data);
    } catch { setError("Stock data unavailable. Check the symbol and try again."); }
    setStockLoading(false);
  };

  const handleTrend = async () => {
    if (!trendKeyword.trim()) return;
    setTrendLoading(true); setError(null); setTrendData(null);
    try {
      const res = await axios.get(`${API_URL}/trends/${encodeURIComponent(trendKeyword.trim())}`);
      setTrendData(res.data);
    } catch { setError("Trends data unavailable."); }
    setTrendLoading(false);
  };

  /* ── shared input style ── */
  const inputStyle = {
    flex: 1, minWidth: 200, padding: "11px 16px",
    background: "#111", border: "1px solid #222", borderRadius: 8,
    color: "#f0ede8", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    outline: "none", transition: "border-color 0.15s",
  };
  const primaryBtn = (isLoading) => ({
    padding: "11px 24px", border: "none", borderRadius: 8,
    background: isLoading ? "#1e0a0a" : "linear-gradient(135deg,#8B1A1A,#C41E3A)",
    color: isLoading ? "#555" : "#fff", fontSize: 13, fontWeight: 600,
    cursor: isLoading ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
    transition: "opacity 0.15s",
  });

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0a0a0a; font-family: 'DM Sans', system-ui, sans-serif; color: #f0ede8; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0f0f0f} ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:4px}
        input::placeholder{color:#444} button{transition:all 0.15s}
        .ind-item{cursor:pointer;transition:all 0.15s;border-left:3px solid transparent;border-radius:0 6px 6px 0}
        .ind-item:hover{background:#161616!important}
        .ind-item.active{background:rgba(139,26,26,0.2)!important;border-left-color:#C41E3A!important}
        .nav-btn{transition:all 0.15s;border-radius:0 6px 6px 0;font-family:'DM Sans',sans-serif}
        .nav-btn:hover{color:#c9c4bc!important}
        .nav-btn.active{background:rgba(139,26,26,0.18)!important;border-left-color:#C41E3A!important;color:#f0ede8!important}
        .tab{border:none;background:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;margin-bottom:-1px}
        .tab:hover{color:#c9c4bc!important}
        .tab.active{color:#f0ede8!important;border-bottom-color:#C41E3A!important}
        .primary-btn:hover{opacity:0.88;transform:translateY(-1px)}
        .outline-btn:hover{background:rgba(139,26,26,0.1)!important;border-color:#5a1010!important}
        .chip-btn:hover{background:rgba(255,255,255,0.06)!important}
        .metric-card{animation:fadeUp 0.4s ease forwards;opacity:0}
        .insight-card{animation:fadeUp 0.45s ease forwards;opacity:0}
        .fade-in{animation:fadeUp 0.35s ease}
        .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:90}
        @media(max-width:768px){
          .sidebar{transform:translateX(-100%);transition:transform 0.25s;position:fixed!important;top:0;left:0;height:100vh!important;z-index:100;width:260px!important}
          .sidebar.open{transform:translateX(0)!important}
          .overlay.open{display:block}
          .mobile-bar{display:flex!important}
          .desktop-tabs{display:none!important}
          .main{padding:16px!important;padding-top:64px!important}
          .hero{padding:28px 20px!important}
          .hero h1{font-size:30px!important}
          .metrics-grid{grid-template-columns:repeat(2,1fr)!important}
          .stock-head{flex-direction:column!important}
        }
        @media(min-width:769px){.mobile-bar{display:none!important}}
      `}</style>

      {/* Mobile overlay */}
      <div className={`overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ════════ SIDEBAR ════════ */}
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`} style={{
          width: 236, background: "#0d0d0d", borderRight: "1px solid #1a1a1a",
          display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
          overflowY: "auto", flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid #181818" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 21, letterSpacing: -0.5, background: "linear-gradient(135deg,#C41E3A,#E8394F)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PathViz</span>
                <p style={{ color: "#444", fontSize: 9, letterSpacing: 1.8, textTransform: "uppercase", marginTop: 2 }}>Analytics Platform</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }} className="mobile-bar">
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Nav */}
          <div style={{ padding: "16px 10px 8px" }}>
            <p style={{ color: "#333", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", padding: "0 10px 8px" }}>Views</p>
            {[
              { id: "analyze", label: "Data Analysis", icon: <ChartIcon /> },
              { id: "stock",   label: "Live Stock",    icon: <StockIcon /> },
              { id: "trends",  label: "Market Trends", icon: <TrendIcon /> },
            ].map(t => (
              <button key={t.id} className={`nav-btn${activeTab === t.id ? " active" : ""}`}
                onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "9px 10px", background: "transparent", border: "none",
                  borderLeft: "3px solid transparent",
                  color: activeTab === t.id ? "#f0ede8" : "#555",
                  fontSize: 13, fontWeight: 500, marginBottom: 2, cursor: "pointer",
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Industries */}
          {activeTab === "analyze" && (
            <div style={{ padding: "14px 10px 8px", borderTop: "1px solid #181818", marginTop: 8 }}>
              <p style={{ color: "#333", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", padding: "0 10px 8px" }}>Industry</p>
              {INDUSTRIES.map(ind => (
                <div key={ind.id} className={`ind-item${industry === ind.id ? " active" : ""}`}
                  onClick={() => { setIndustry(ind.id); setResults(null); setError(null); setSidebarOpen(false); }}
                  style={{ padding: "8px 10px", marginBottom: 1 }}>
                  <p style={{ color: industry === ind.id ? "#f0ede8" : "#777", fontSize: 12, fontWeight: 500 }}>{ind.label}</p>
                  <p style={{ color: "#3a3a3a", fontSize: 10, marginTop: 1 }}>{ind.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bottom badge */}
          <div style={{ marginTop: "auto", padding: "16px 16px 20px" }}>
            <div style={{ background: "rgba(139,26,26,0.12)", border: "1px solid rgba(196,30,58,0.15)", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ color: "#7a1020", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>India Benchmarks</p>
              <p style={{ color: "#3a3a3a", fontSize: 10, lineHeight: 1.6 }}>Metrics compared against verified Indian market averages from 2024 reports</p>
            </div>
          </div>
        </aside>

        {/* ════════ MOBILE TOPBAR ════════ */}
        <div className="mobile-bar" style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 52, zIndex: 50,
          background: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
          display: "none", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
        }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 19, background: "linear-gradient(135deg,#C41E3A,#E8394F)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PathViz</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {[
              { id: "analyze", icon: <ChartIcon /> },
              { id: "stock",   icon: <StockIcon /> },
              { id: "trends",  icon: <TrendIcon /> },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: "none", border: "none", color: activeTab === t.id ? "#C41E3A" : "#555", cursor: "pointer", padding: 4 }}>{t.icon}</button>
            ))}
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 4 }}><MenuIcon /></button>
          </div>
        </div>

        {/* ════════ MAIN ════════ */}
        <main className="main" style={{ flex: 1, padding: "40px 44px", overflowY: "auto", maxWidth: "100%" }}>

          {/* Mobile spacer */}
          <div className="mobile-bar" style={{ height: 52, display: "none" }} />

          {/* ─── HERO ─── */}
          <div className="hero" style={{
            background: "linear-gradient(140deg,#1c0606 0%,#2a0808 45%,#0f0f0f 100%)",
            borderRadius: 14, padding: "44px 40px", marginBottom: 36,
            border: "1px solid rgba(139,26,26,0.2)", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, background: "radial-gradient(circle,rgba(139,26,26,0.12) 0%,transparent 65%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: "30%", width: 200, height: 200, background: "radial-gradient(circle,rgba(196,30,58,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
            <p style={{ color: "#7a1020", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>India's Multi-Industry Analytics Platform</p>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, marginBottom: 14, color: "#f0ede8" }}>
              Turn raw data into<br />
              <span style={{ background: "linear-gradient(135deg,#C41E3A 0%,#E8394F 50%,#ff7070 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>market intelligence.</span>
            </h1>
            <p style={{ color: "#555", fontSize: 14, maxWidth: 460, lineHeight: 1.7 }}>
              Upload a CSV, select your industry, and get AI-generated insights benchmarked against real Indian market data — in seconds.
            </p>
            <div style={{ display: "flex", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
              {["8 Industries","NSE / BSE Live Quotes","Google Trends India","AI-Powered Insights"].map(tag => (
                <span key={tag} style={{ color: "#444", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#8B1A1A", display: "inline-block" }} />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* ─── DESKTOP TABS ─── */}
          <div className="desktop-tabs" style={{ display: "flex", gap: 28, borderBottom: "1px solid #1a1a1a", marginBottom: 32 }}>
            {[
              { id: "analyze", label: "Data Analysis" },
              { id: "stock",   label: "Live Stock" },
              { id: "trends",  label: "Market Trends" },
            ].map(t => (
              <button key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
                style={{
                  color: activeTab === t.id ? "#f0ede8" : "#444",
                  borderBottom: activeTab === t.id ? "2px solid #C41E3A" : "2px solid transparent",
                  fontSize: 13, fontWeight: 500, padding: "0 0 13px",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════
              DATA ANALYSIS
          ══════════════════════════ */}
          {activeTab === "analyze" && (
            <div className="fade-in">
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: "#f0ede8", marginBottom: 4 }}>{sel?.label} Analytics</h2>
                <p style={{ color: "#3a3a3a", fontSize: 11 }}>Required columns: <span style={{ color: "#555", fontFamily: "monospace", fontSize: 10 }}>{sel?.columns}</span></p>
              </div>

              {/* Upload card */}
              <div style={{ background: "#111", border: "1px solid #1c1c1c", borderRadius: 12, padding: 22, marginBottom: 14 }}>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={e => { setFile(e.target.files[0]); setResults(null); setError(null); }} style={{ display: "none" }} id="fi" />
                <label htmlFor="fi" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "26px 20px", border: "1.5px dashed #222", borderRadius: 8,
                  cursor: "pointer", color: file ? "#aaa" : "#444", fontSize: 13,
                }}>
                  <UploadIcon />
                  {file ? file.name : "Drop CSV or Excel file here, or click to browse"}
                </label>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="primary-btn" onClick={() => handleAnalyze("upload")} disabled={loading}
                    style={primaryBtn(loading)}>
                    {loading
                      ? <span style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span style={{ width:11,height:11,border:"2px solid #444",borderTopColor:"#C41E3A",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite" }}/>
                          Analyzing…
                        </span>
                      : "Analyze File"}
                  </button>
                  <button className="outline-btn" onClick={() => handleAnalyze("sample")} disabled={loading}
                    style={{ padding:"11px 20px",background:"transparent",border:"1px solid #222",borderRadius:8,color:"#666",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    Try Sample Data
                  </button>
                </div>

                {industry === "marketing" && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #181818" }}>
                    <p style={{ color: "#333", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Connect Mock API</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {MOCK_APIS.map(api => (
                        <button key={api.id} className="chip-btn" onClick={() => handleAnalyze("mock_api", api.id)} disabled={loading}
                          style={{ padding:"6px 14px",background:"transparent",border:`1px solid ${api.color}22`,borderRadius:20,color:api.color,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                          {api.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:8,padding:"11px 16px",marginBottom:16 }}>
                  <p style={{ color:"#ef4444",fontSize:13 }}>{error}</p>
                </div>
              )}

              {/* Loading skeletons */}
              {loading && (
                <div>
                  <div className="metrics-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10,marginBottom:14 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ background:"#111",borderRadius:10,padding:16 }}>
                        <Skeleton h={9} w="55%" mb={10} radius={4} />
                        <Skeleton h={26} w="70%" radius={4} />
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"#111",borderRadius:10,padding:20,marginBottom:12 }}><Skeleton h={210} radius={6} /></div>
                  <div style={{ background:"#111",borderRadius:10,padding:20 }}>
                    <Skeleton h={13} w="35%" mb={14} radius={4} />
                    {[1,2,3].map(i => <Skeleton key={i} h={50} mb={8} radius={6} />)}
                  </div>
                </div>
              )}

              {/* Results */}
              {results && !results.error && (
                <div className="fade-in">
                  {results.ai_used && (
                    <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(139,26,26,0.12)",border:"1px solid rgba(196,30,58,0.2)",borderRadius:20,padding:"5px 12px",marginBottom:18,fontSize:10,color:"#C41E3A",fontWeight:700,letterSpacing:1 }}>
                      <StarIcon /> AI-POWERED INSIGHTS
                    </div>
                  )}

                  {/* Metrics grid */}
                  <div className="metrics-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(158px,1fr))",gap:10,marginBottom:14 }}>
                    {Object.entries(results.metrics).map(([key, value], idx) => {
                      const tip = explainMetric(key, value);
                      return (
                        <div key={key} className="metric-card" style={{
                          background:"#111",borderRadius:10,padding:"16px 14px",
                          border:"1px solid #1c1c1c",animationDelay:`${idx*0.06}s`,
                        }}>
                          <p style={{ color:"#3d3d3d",fontSize:9,textTransform:"uppercase",letterSpacing:1.3,marginBottom:8,fontWeight:600 }}>{key}</p>
                          <p style={{ color:"#f0ede8",fontSize:22,fontWeight:700,fontFamily:"'Syne',sans-serif",letterSpacing:-0.5,lineHeight:1 }}>{value}</p>
                          {tip && <p style={{ color:"#3a3a3a",fontSize:10,marginTop:9,lineHeight:1.55 }}>{tip.length > 85 ? tip.slice(0,82)+"…" : tip}</p>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bar chart */}
                  {results.chart_data?.length > 0 && (
                    <div style={{ background:"#111",borderRadius:10,padding:"20px 14px 14px",marginBottom:12,border:"1px solid #1c1c1c" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:18,flexWrap:"wrap",gap:8 }}>
                        <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#c9c4bc" }}>Your Performance vs India Benchmark</h3>
                        <span style={{ color:"#333",fontSize:10 }}>{results.source}</span>
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={results.chart_data} margin={{ top:4,right:8,left:-14,bottom:0 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="#1a1a1a" vertical={false} />
                          <XAxis dataKey="name" stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTip />} />
                          <Legend wrapperStyle={{ fontSize:11,color:"#555",paddingTop:14 }} />
                          <Bar dataKey="Yours" fill="#C41E3A" radius={[4,4,0,0]} maxBarSize={44} />
                          <Bar dataKey="India Avg" fill="#222" radius={[4,4,0,0]} maxBarSize={44} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Insights */}
                  {results.insights?.length > 0 && (
                    <div style={{ background:"#111",borderRadius:10,padding:20,border:"1px solid #1c1c1c" }}>
                      <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#c9c4bc",marginBottom:14 }}>What this means for your business</h3>
                      {results.insights.map((ins, i) => {
                        const mKey = Object.keys(results.metrics)[i];
                        const mVal = Object.values(results.metrics)[i];
                        const deep = mKey ? explainMetric(mKey, mVal) : null;
                        const dot = ins.status === "excellent" ? "#22c55e" : ins.status === "warning" ? "#f59e0b" : "#C41E3A";
                        return (
                          <div key={i} className="insight-card" style={{
                            background:"#0e0e0e",borderRadius:8,padding:"13px 16px",
                            marginBottom:8,borderLeft:`2px solid ${dot}`,
                            animationDelay:`${i*0.08}s`,
                          }}>
                            <div style={{ display:"flex",gap:9,alignItems:"flex-start" }}>
                              <span style={{ width:6,height:6,borderRadius:"50%",background:dot,flexShrink:0,marginTop:4 }} />
                              <div>
                                <p style={{ color:"#bbb",fontSize:13,lineHeight:1.55 }}>{ins.message}</p>
                                {deep && <p style={{ color:"#3d3d3d",fontSize:11,marginTop:6,lineHeight:1.6 }}>{deep}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════
              LIVE STOCK
          ══════════════════════════ */}
          {activeTab === "stock" && (
            <div className="fade-in">
              <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:"#f0ede8",marginBottom:5 }}>NSE / BSE Live Quotes</h2>
              <p style={{ color:"#444",fontSize:13,marginBottom:22 }}>Real-time prices via Yahoo Finance. Enter any NSE (.NS) or BSE (.BO) ticker.</p>

              <div style={{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" }}>
                <input value={stockSymbol} onChange={e => setStockSymbol(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleStock()}
                  placeholder="e.g. RELIANCE.NS · TCS.NS · HDFCBANK.NS"
                  style={inputStyle} />
                <button className="primary-btn" onClick={handleStock} disabled={stockLoading} style={primaryBtn(stockLoading)}>
                  {stockLoading ? "Loading…" : "Get Quote"}
                </button>
              </div>

              <div style={{ display:"flex",gap:7,marginBottom:26,flexWrap:"wrap" }}>
                {["RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","WIPRO.NS","BAJFINANCE.NS"].map(s => (
                  <button key={s} onClick={() => setStockSymbol(s)}
                    style={{ padding:"4px 11px",background:"#111",border:"1px solid #1c1c1c",borderRadius:20,color:"#555",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    {s.replace(".NS","").replace(".BO","")}
                  </button>
                ))}
              </div>

              {error && <div style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:8,padding:"11px 16px",marginBottom:16 }}><p style={{ color:"#ef4444",fontSize:13 }}>{error}</p></div>}

              {stockLoading && (
                <div style={{ background:"#111",borderRadius:12,padding:28,border:"1px solid #1c1c1c" }}>
                  <Skeleton h={12} w="28%" mb={14} /><Skeleton h={38} w="44%" mb={10} /><Skeleton h={11} w="36%" />
                </div>
              )}

              {stockData && !stockData.error && (
                <div className="fade-in">
                  <div style={{ background:"#111",borderRadius:12,padding:28,border:"1px solid #1c1c1c",marginBottom:12 }}>
                    <div className="stock-head" style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:20,marginBottom:24 }}>
                      <div>
                        <p style={{ color:"#444",fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:5 }}>{stockData.symbol}</p>
                        <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:"#f0ede8",marginBottom:16 }}>{stockData.company_name}</h3>
                        <div style={{ display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"'Syne',sans-serif",fontSize:38,fontWeight:800,color:"#f0ede8",letterSpacing:-1 }}>
                            ₹{stockData.current_price?.toLocaleString("en-IN")}
                          </span>
                          <span style={{ display:"flex",alignItems:"center",gap:4,color:stockData.day_change>=0?"#22c55e":"#ef4444",fontSize:13,fontWeight:600 }}>
                            {stockData.day_change >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                            ₹{Math.abs(stockData.day_change)} ({stockData.day_change_percent}%)
                          </span>
                        </div>
                        <p style={{ color:"#333",fontSize:10,marginTop:5 }}>Today's change</p>
                      </div>
                      {stockData.prediction && (
                        <div style={{ background:"#0e0e0e",borderRadius:10,padding:"14px 18px",border:"1px solid #1a1a1a",minWidth:160 }}>
                          <p style={{ color:"#333",fontSize:9,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8 }}>30-Day Forecast</p>
                          <p style={{ color:stockData.prediction.trend==="increasing"?"#22c55e":"#ef4444",fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif" }}>
                            {stockData.prediction.trend==="increasing"?"Bullish":"Bearish"}
                          </p>
                          <p style={{ color:"#444",fontSize:11,marginTop:4 }}>{stockData.prediction.confidence}% model confidence</p>
                          <p style={{ color:"#2d2d2d",fontSize:10,marginTop:8,lineHeight:1.55 }}>
                            Based on 3-month linear regression. {stockData.prediction.trend==="increasing"?"Upward momentum detected.":"Downward pressure detected."}
                          </p>
                        </div>
                      )}
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,paddingTop:18,borderTop:"1px solid #181818" }}>
                      {[
                        { label:"Volume",     value:stockData.volume?.toLocaleString("en-IN") },
                        { label:"Market Cap", value:stockData.market_cap?`₹${(stockData.market_cap/1e7).toFixed(0)}Cr`:"—" },
                        { label:"P/E Ratio",  value:stockData.pe_ratio||"—" },
                        { label:"52W High",   value:`₹${stockData.week_52_high}` },
                        { label:"52W Low",    value:`₹${stockData.week_52_low}` },
                        { label:"Volatility", value:stockData.volatility||"—" },
                      ].map(m => (
                        <div key={m.label} style={{ background:"#0e0e0e",borderRadius:8,padding:"11px 13px" }}>
                          <p style={{ color:"#333",fontSize:9,textTransform:"uppercase",letterSpacing:1.2,marginBottom:5 }}>{m.label}</p>
                          <p style={{ color:"#bbb",fontSize:13,fontWeight:600 }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:"#111",borderRadius:10,padding:"13px 16px",border:"1px solid #1c1c1c" }}>
                    <p style={{ color:"#3a3a3a",fontSize:11,lineHeight:1.65 }}>
                      A P/E of <strong style={{ color:"#666" }}>{stockData.pe_ratio||"—"}</strong> means the market is pricing {stockData.company_name?.split(" ")[0]} at that multiple of its trailing earnings.
                      {stockData.pe_ratio && stockData.pe_ratio > 30 ? " This is a premium valuation — investors are pricing in strong future growth." :
                       stockData.pe_ratio && stockData.pe_ratio < 15 ? " This is a relatively low valuation — could indicate undervaluation or slower expected growth." :
                       " This sits within a moderate range for Indian large-caps."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════
              MARKET TRENDS
          ══════════════════════════ */}
          {activeTab === "trends" && (
            <div className="fade-in">
              <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:"#f0ede8",marginBottom:5 }}>Google Trends — India</h2>
              <p style={{ color:"#444",fontSize:13,marginBottom:22 }}>Track search interest for any keyword in India over the last 90 days.</p>

              <div style={{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" }}>
                <input value={trendKeyword} onChange={e => setTrendKeyword(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleTrend()}
                  placeholder="e.g. upi · nifty50 · mutual funds · crypto"
                  style={inputStyle} />
                <button className="primary-btn" onClick={handleTrend} disabled={trendLoading} style={primaryBtn(trendLoading)}>
                  {trendLoading ? "Searching…" : "Search"}
                </button>
              </div>

              <div style={{ display:"flex",gap:7,marginBottom:26,flexWrap:"wrap" }}>
                {["upi","nifty50","mutual funds","crypto india","zerodha","paytm","sip"].map(k => (
                  <button key={k} onClick={() => setTrendKeyword(k)}
                    style={{ padding:"4px 11px",background:"#111",border:"1px solid #1c1c1c",borderRadius:20,color:"#555",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    {k}
                  </button>
                ))}
              </div>

              {error && <div style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:8,padding:"11px 16px",marginBottom:16 }}><p style={{ color:"#ef4444",fontSize:13 }}>{error}</p></div>}

              {trendData && (
                <div className="fade-in">
                  <div style={{ background:"#111",borderRadius:12,padding:24,border:"1px solid #1c1c1c",marginBottom:12 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12 }}>
                      <div>
                        <p style={{ color:"#333",fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:5 }}>Search Interest Score</p>
                        <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"#f0ede8" }}>"{trendData.keyword}"</h3>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ color:"#333",fontSize:9,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4 }}>Current Score</p>
                        <p style={{ fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:800,color:"#C41E3A",letterSpacing:-1,lineHeight:1 }}>
                          {trendData.current_interest}
                          <span style={{ fontSize:13,color:"#444",fontWeight:400 }}>/100</span>
                        </p>
                      </div>
                    </div>

                    {trendData.interest_over_time?.length > 0 && (
                      <ResponsiveContainer width="100%" height={190}>
                        <AreaChart data={trendData.interest_over_time.map((v, i) => ({ d: i+1, v }))} margin={{ top:4,right:0,left:-22,bottom:0 }}>
                          <defs>
                            <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C41E3A" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#C41E3A" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="#181818" vertical={false}/>
                          <XAxis dataKey="d" stroke="#2a2a2a" fontSize={9} tickLine={false} axisLine={false}/>
                          <YAxis stroke="#2a2a2a" fontSize={9} tickLine={false} axisLine={false} domain={[0,100]}/>
                          <Tooltip contentStyle={{ background:"#181818",border:"1px solid #2a2a2a",borderRadius:8,color:"#f0ede8",fontSize:12 }} formatter={(v) => [v, "Interest"]} labelFormatter={d => `Day ${d}`}/>
                          <Area type="monotone" dataKey="v" stroke="#C41E3A" strokeWidth={1.5} fill="url(#tg)" dot={false}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                    <p style={{ color:"#2d2d2d",fontSize:9,marginTop:10,textAlign:"right" }}>{trendData.source}</p>
                  </div>

                  <div style={{ background:"#111",borderRadius:10,padding:"13px 16px",border:"1px solid #1c1c1c" }}>
                    <p style={{ color:"#3a3a3a",fontSize:11,lineHeight:1.65 }}>
                      A score of <strong style={{ color:"#666" }}>{trendData.current_interest}</strong> indicates{" "}
                      {trendData.current_interest > 70
                        ? "very high current search demand in India — strong signal for content campaigns, ad targeting, or product positioning around this keyword."
                        : trendData.current_interest > 40
                        ? "moderate interest — this keyword is gaining traction and worth monitoring as a potential content or ad opportunity."
                        : "low current search volume — likely niche, seasonal, or early-stage. Track over time to catch an inflection point."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop:56,paddingTop:20,borderTop:"1px solid #141414",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,color:"#222",fontSize:15 }}>PathViz</span>
            <p style={{ color:"#2a2a2a",fontSize:10 }}>Benchmarks: AppsFlyer · NSE · SHRM · LinkedIn · Unicommerce · Scopus · NHA · RBI — India 2024</p>
          </div>
        </main>
      </div>
    </>
  );
}