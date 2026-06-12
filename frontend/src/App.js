import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const INDUSTRIES = [
  { id: "marketing",  label: "Marketing Analytics", icon: "📱", description: "CAC, LTV, ROI, CTR",            columns: "spend, installs, revenue, active_users" },
  { id: "stock",      label: "Stock Market",         icon: "📈", description: "Returns, volatility, Sharpe",  columns: "date, open, high, low, close, volume" },
  { id: "hr",         label: "HR Analytics",         icon: "👥", description: "Attrition, cost per hire",     columns: "employees, attrition, cost_per_hire, time_to_hire, engagement_score" },
  { id: "sales",      label: "Sales Analytics",      icon: "💼", description: "Conversion, deal size, cycle", columns: "deal_size, status, sales_cycle_days" },
  { id: "ecommerce",  label: "E-commerce",            icon: "🛒", description: "AOV, cart abandonment",       columns: "order_value, cart_abandoned, returned, converted" },
];

// Auto-detect environment: Railway in production, localhost in dev
const API_URL = process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://pathviz-production.up.railway.app");

const MOCK_APIS = [
  { id: "google_ads", label: "Google Ads",  color: "#4285f4", icon: "🔵" },
  { id: "meta_ads",   label: "Meta Ads",    color: "#60a5fa", icon: "🔷" },
  { id: "hubspot",    label: "HubSpot CRM", color: "#5eead4", icon: "🟠" },
];

const SUPABASE_URL      = "https://fydfhzulozwjncbnmmwa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZGZoenVsb3p3am5jYm5tbXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDY3NTcsImV4cCI6MjA5NTQyMjc1N30.6JCeGDkmhMWBph02qK3_EgxjBjHfE43_MsXlrCTmLqo";

const G = {
  bg:         "#0d1f1f",
  bgCard:     "#112828",
  bgElevated: "#163333",
  teal:       "#2dd4bf",
  tealDim:    "#0f766e",
  tealMuted:  "#134e4a",
  white:      "#f0fafa",
  offwhite:   "#b2d8d8",
  muted:      "#4d8080",
  border:     "#1e3a3a",
  green:      "#4ade80",
  amber:      "#fbbf24",
  red:        "#f87171",
  purple:     "#a78bfa",
  purpleDim:  "#4c1d95",
  font:       "'Georgia', 'Times New Roman', serif",
  fontSans:   "'Segoe UI', system-ui, sans-serif",
};

// ─── Status dot colours ───────────────────────────────────────────────────────
const STATUS_COLOR = { excellent: G.green, warning: G.amber, info: G.teal };

function App() {
  const [file,       setFile]       = useState(null);
  const [industry,   setIndustry]   = useState("marketing");
  const [results,    setResults]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [dataSource, setDataSource] = useState("upload");
  const [history,    setHistory]    = useState([]);

  const selectedIndustry = INDUSTRIES.find(i => i.id === industry);

  // ── Fetch history from Supabase ──────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/analyses?select=*&order=created_at.desc&limit=10`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (err) { console.error("History fetch error:", err); }
  };

  useEffect(() => { fetchHistory(); }, []);

  // ── File change ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
    setError(null);
    setDataSource("upload");
  };

  // ── Analyse ──────────────────────────────────────────────────────────────
  const handleAnalyze = async (source = "upload", platform = "") => {
    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("industry", industry);

    if (source === "sample" || source === "mock_api") {
      formData.append("use_sample", "true");
      if (platform) formData.append("mock_platform", platform);
    } else {
      if (!file) {
        setError("Please select a CSV or Excel file first.");
        setLoading(false);
        return;
      }
      formData.append("file", file);
    }

    try {
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = response.data;

      // Backend returned a soft error
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setResults(data);
      setDataSource(source === "mock_api" ? platform : source);
      fetchHistory();
    } catch (err) {
      console.error("Axios error:", err);
      if (err.response) {
        setError(`Server error ${err.response.status}: ${err.response.data?.detail || err.response.statusText}`);
      } else if (err.request) {
        setError("Cannot reach the backend. Make sure it is running on http://localhost:8000");
      } else {
        setError(`Unexpected error: ${err.message}`);
      }
    }
    setLoading(false);
  };

  return (
    <div style={S.shell}>

      {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarInner}>

          <div style={S.brandBlock}>
            <div style={S.brandName}>PathViz</div>
            <div style={S.brandTagline}>Analytics for India</div>
          </div>

          <nav>
            <p style={S.navLabel}>Industries</p>
            {INDUSTRIES.map(ind => (
              <div
                key={ind.id}
                onClick={() => { setIndustry(ind.id); setResults(null); setError(null); }}
                style={{ ...S.navItem, ...(industry === ind.id ? S.navItemActive : {}) }}
              >
                <span style={S.navItemIcon}>{ind.icon}</span>
                <div>
                  <div style={{ ...S.navItemLabel, ...(industry === ind.id ? S.navItemLabelActive : {}) }}>
                    {ind.label}
                  </div>
                  <div style={S.navItemDesc}>{ind.description}</div>
                </div>
              </div>
            ))}
          </nav>

          {history.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <p style={S.navLabel}>Recent</p>
              {history.slice(0, 5).map(item => (
                <div key={item.id} style={S.historyRow}>
                  <span style={S.historyName}>
                    {INDUSTRIES.find(i => i.id === item.industry)?.icon} {item.industry}
                  </span>
                  <span style={S.historyDate}>
                    {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────────── */}
      <main style={S.main}>

        {/* TOPBAR */}
        <div style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{selectedIndustry.icon} {selectedIndustry.label}</h1>
            <p style={S.pageSub}>
              Flexible columns — app auto-detects your data.&nbsp;
              <span style={S.colList}>Expected: {selectedIndustry.columns}</span>
            </p>
          </div>
          <div style={S.indiaBadge}>🇮🇳 India Benchmarks</div>
        </div>

        <div style={S.contentArea}>

          {/* ── UPLOAD PANEL ─────────────────────────────────────────── */}
          <div style={S.panel}>
            <h2 style={S.panelHeading}>Upload Your Data</h2>
            <p style={S.panelSub}>
              CSV or Excel (.xlsx) — messy data, missing columns, encoding issues all handled automatically
            </p>

            {/* Hidden file input accepts csv + xlsx */}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="fileInput"
            />
            <label htmlFor="fileInput" style={S.dropZone}>
              <span style={S.dropIcon}>{file ? "📄" : "⬆️"}</span>
              <div>
                <div style={S.dropText}>{file ? file.name : "Click to choose a CSV or Excel file"}</div>
                {!file && <div style={S.dropHint}>Any format, any columns — we'll figure it out</div>}
              </div>
            </label>

            <button
              onClick={() => handleAnalyze("upload")}
              style={loading ? S.btnLoading : S.btn}
              disabled={loading}
            >
              {loading ? "Analyzing…" : `Analyze ${selectedIndustry.label}`}
            </button>

            <div style={S.orRow}>
              <div style={S.orLine} />
              <span style={S.orText}>or try without uploading</span>
              <div style={S.orLine} />
            </div>

            <button onClick={() => handleAnalyze("sample")} style={S.btnGhost} disabled={loading}>
              🎲 Try Sample Data
            </button>

            {industry === "marketing" && (
              <div style={{ marginTop: "20px" }}>
                <p style={S.mockLabel}>Connect Mock API</p>
                <div style={S.mockGrid}>
                  {MOCK_APIS.map(api => (
                    <button
                      key={api.id}
                      onClick={() => handleAnalyze("mock_api", api.id)}
                      style={{ ...S.mockBtn, borderColor: api.color, color: api.color }}
                      disabled={loading}
                    >
                      {api.icon} {api.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={S.errorBox}>
                <strong>⚠️ Error</strong><br />{error}
              </div>
            )}
          </div>

          {/* ── RESULTS ──────────────────────────────────────────────── */}
          {results && (
            <>
              {/* Source badge */}
              {dataSource !== "upload" && (
                <div style={S.sourcePill}>
                  {dataSource === "sample"     && "🎲 Sample Data"}
                  {dataSource === "google_ads" && "🔵 Mock Google Ads API"}
                  {dataSource === "meta_ads"   && "🔷 Mock Meta Ads API"}
                  {dataSource === "hubspot"    && "🟠 Mock HubSpot CRM API"}
                </div>
              )}

              {/* METRICS GRID */}
              {results.metrics && (
                <div style={S.metricsGrid}>
                  {Object.entries(results.metrics).map(([key, value]) => {
                    const sv = String(value);
                    const bad  = sv.startsWith("-") || key.toLowerCase().includes("attrition") || key.toLowerCase().includes("abandon") || key.toLowerCase().includes("return rate");
                    const good = !bad && (sv.includes("+") || (parseFloat(sv) > 1 && !key.toLowerCase().includes("cac") && !key.toLowerCase().includes("cycle")));
                    const color = bad ? G.red : good ? G.green : G.teal;
                    return (
                      <div key={key} style={S.metricCard}>
                        <div style={S.metricLabel}>{key}</div>
                        <div style={{ ...S.metricValue, color }}>{value}</div>
                        <div style={{ ...S.metricAccent, background: color }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CHART */}
              <div style={S.panel}>
                <h2 style={S.panelHeading}>Performance vs India Benchmark</h2>
                <p style={S.panelSub}>Source: {results.source}</p>
                <div style={{ marginTop: "20px" }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={results.chart_data || []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={G.border} vertical={false} />
                      <XAxis dataKey="name" stroke={G.muted} fontSize={11} />
                      <YAxis stroke={G.muted} fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: G.bgElevated, border: `1px solid ${G.border}`,
                          borderRadius: "8px", color: G.white, fontSize: "13px"
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px", color: G.offwhite }} />
                      <Bar dataKey="Yours"     fill={G.teal}     radius={[4,4,0,0]} />
                      <Bar dataKey="India Avg" fill={G.tealMuted} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* PREDICTIONS */}
              {results.predictions && results.predictions.length > 0 && (
                <div style={S.panel}>
                  <h2 style={S.panelHeading}>3-Month Predictions</h2>
                  <p style={S.panelSub}>Linear regression · scikit-learn</p>
                  {results.predictions.map((pred, i) => (
                    <div key={i} style={S.predCard}>
                      <div style={S.predRow}>
                        <span style={S.predMetric}>{pred.metric}</span>
                        <span style={{ ...S.predTrend, color: pred.trend === "increasing" ? G.green : G.amber }}>
                          {pred.direction} {pred.trend.toUpperCase()}
                        </span>
                      </div>
                      <div style={S.predVals}>
                        {pred.values.map((val, j) => (
                          <div key={j} style={S.predVal}>
                            <div style={S.predMonth}>Month {j+1}</div>
                            <div style={S.predAmt}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <p style={{ ...S.predAlert, color: pred.trend === "increasing" ? G.green : G.amber }}>
                        {pred.alert}
                      </p>
                      <p style={S.predConf}>Model confidence: {pred.confidence}%</p>
                    </div>
                  ))}
                </div>
              )}

              {/* RULE-BASED BENCHMARK INSIGHTS */}
              <div style={S.panel}>
                <h2 style={S.panelHeading}>India Benchmark Analysis</h2>
                <p style={S.panelSub}>Source: {results.source || "Industry Report"}</p>
                {(results.insights || []).map((insight, i) => (
                  <div key={i} style={S.insightRow}>
                    <div style={{ ...S.insightDot, background: STATUS_COLOR[insight.status] || G.teal }} />
                    <p style={{ ...S.insightText, color: insight.status === "excellent" ? "#86efac" : "#fde68a" }}>
                      {insight.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── GROQ AI INSIGHTS ─────────────────────────────────── */}
              {results.ai_insights && results.ai_insights.length > 0 && (
                <div style={{ ...S.panel, border: `1px solid ${G.purpleDim}`, background: "#120d22" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <div style={S.groqBadge}>✨ Groq AI</div>
                    <h2 style={{ ...S.panelHeading, margin: 0 }}>AI-Powered Insights</h2>
                  </div>
                  <p style={S.panelSub}>Generated by Llama 3.1 via Groq — India market context</p>

                  {results.ai_insights.map((insight, i) => (
                    <div key={i} style={{ ...S.insightRow, borderColor: "#2e1f4a" }}>
                      <div style={{
                        width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                        background: i === 0 ? "#22c55e22" : i === 1 ? "#f59e0b22" : "#a78bfa22",
                        border: `1px solid ${i === 0 ? G.green : i === 1 ? G.amber : G.purple}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", color: i === 0 ? G.green : i === 1 ? G.amber : G.purple,
                        fontWeight: "700"
                      }}>
                        {i === 0 ? "✓" : i === 1 ? "!" : "→"}
                      </div>
                      <p style={{
                        ...S.insightText,
                        color: i === 0 ? "#86efac" : i === 1 ? "#fde68a" : "#c4b5fd"
                      }}>
                        {insight.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  shell: { display: "flex", minHeight: "100vh", backgroundColor: G.bg, fontFamily: G.fontSans, color: G.white },

  sidebar: {
    width: "260px", backgroundColor: G.bgCard, borderRight: `1px solid ${G.border}`,
    flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto",
  },
  sidebarInner: { padding: "28px 20px" },
  brandBlock: { marginBottom: "36px", paddingBottom: "24px", borderBottom: `1px solid ${G.border}` },
  brandName: { fontFamily: G.font, fontSize: "34px", fontWeight: "700", color: G.teal, letterSpacing: "-1px", lineHeight: 1 },
  brandTagline: { fontSize: "10px", color: G.muted, marginTop: "6px", letterSpacing: "2px", textTransform: "uppercase" },

  navLabel: { fontSize: "10px", color: G.muted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px", marginTop: 0 },
  navItem: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", marginBottom: "2px", transition: "background 0.15s" },
  navItemActive: { backgroundColor: G.tealMuted },
  navItemIcon: { fontSize: "16px", marginTop: "1px" },
  navItemLabel: { fontSize: "13px", fontWeight: "600", color: G.offwhite },
  navItemLabelActive: { color: G.teal },
  navItemDesc: { fontSize: "11px", color: G.muted, marginTop: "2px" },

  historyRow: { display: "flex", justifyContent: "space-between", padding: "6px 12px", marginBottom: "2px" },
  historyName: { fontSize: "12px", color: G.muted, textTransform: "capitalize" },
  historyDate: { fontSize: "11px", color: G.tealDim },

  main: { flex: 1, display: "flex", flexDirection: "column" },
  topbar: {
    padding: "24px 40px", borderBottom: `1px solid ${G.border}`,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    backgroundColor: G.bgCard, position: "sticky", top: 0, zIndex: 10,
  },
  pageTitle: { fontFamily: G.font, fontSize: "28px", fontWeight: "700", color: G.white, margin: 0, letterSpacing: "-0.5px" },
  pageSub: { fontSize: "12px", color: G.muted, marginTop: "4px", marginBottom: 0 },
  colList: { color: G.teal },
  indiaBadge: { backgroundColor: G.tealMuted, color: G.teal, fontSize: "11px", fontWeight: "700", padding: "6px 14px", borderRadius: "20px", letterSpacing: "0.5px", border: `1px solid ${G.tealDim}` },

  contentArea: { padding: "32px 40px", display: "flex", flexDirection: "column", gap: "20px" },

  panel: { backgroundColor: G.bgCard, borderRadius: "12px", padding: "28px", border: `1px solid ${G.border}` },
  panelHeading: { fontFamily: G.font, fontSize: "22px", fontWeight: "700", color: G.white, margin: "0 0 4px 0", letterSpacing: "-0.3px" },
  panelSub: { fontSize: "12px", color: G.muted, margin: "0 0 20px 0" },

  dropZone: {
    display: "flex", alignItems: "center", gap: "14px",
    padding: "22px", backgroundColor: G.bg, border: `1.5px dashed ${G.tealDim}`,
    borderRadius: "10px", cursor: "pointer", marginBottom: "16px",
  },
  dropIcon: { fontSize: "28px" },
  dropText: { fontSize: "14px", color: G.offwhite, fontWeight: "600" },
  dropHint: { fontSize: "11px", color: G.muted, marginTop: "3px" },

  btn: { width: "100%", padding: "14px", backgroundColor: G.teal, color: G.bg, border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" },
  btnLoading: { width: "100%", padding: "14px", backgroundColor: G.tealDim, color: G.offwhite, border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "not-allowed" },
  btnGhost: { width: "100%", padding: "13px", backgroundColor: "transparent", color: G.teal, border: `1.5px solid ${G.tealDim}`, borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },

  orRow: { display: "flex", alignItems: "center", gap: "12px", margin: "16px 0" },
  orLine: { flex: 1, height: "1px", backgroundColor: G.border },
  orText: { fontSize: "11px", color: G.muted, whiteSpace: "nowrap" },

  mockLabel: { fontSize: "10px", color: G.muted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", marginTop: 0 },
  mockGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" },
  mockBtn: { padding: "9px", backgroundColor: "transparent", border: "1.5px solid", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" },

  errorBox: { marginTop: "14px", backgroundColor: "#2d1010", border: "1px solid #7f2020", borderRadius: "8px", padding: "12px 16px", color: G.red, fontSize: "13px", lineHeight: "1.6" },

  sourcePill: { backgroundColor: G.bgCard, border: `1px solid ${G.tealDim}`, borderRadius: "8px", padding: "10px 20px", textAlign: "center", color: G.teal, fontSize: "13px", fontWeight: "600" },

  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" },
  metricCard: { backgroundColor: G.bgCard, borderRadius: "12px", padding: "22px", border: `1px solid ${G.border}`, position: "relative", overflow: "hidden" },
  metricLabel: { fontSize: "11px", color: G.muted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" },
  metricValue: { fontFamily: G.font, fontSize: "28px", fontWeight: "700", letterSpacing: "-1px", lineHeight: 1 },
  metricAccent: { width: "4px", height: "36px", borderRadius: "2px", position: "absolute", top: "22px", right: "22px" },

  predCard: { backgroundColor: G.bg, borderRadius: "10px", padding: "18px", marginBottom: "12px", border: `1px solid ${G.border}` },
  predRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  predMetric: { fontSize: "14px", fontWeight: "700", color: G.white },
  predTrend: { fontSize: "11px", fontWeight: "700", letterSpacing: "1px" },
  predVals: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" },
  predVal: { textAlign: "center", backgroundColor: G.bgCard, borderRadius: "8px", padding: "10px", border: `1px solid ${G.border}` },
  predMonth: { color: G.muted, fontSize: "10px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" },
  predAmt: { color: G.teal, fontSize: "16px", fontWeight: "700", fontFamily: G.font },
  predAlert: { fontSize: "13px", margin: "0 0 5px 0", fontWeight: "600" },
  predConf: { color: G.muted, fontSize: "11px", margin: 0 },

  insightRow: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 0", borderBottom: `1px solid ${G.border}` },
  insightDot: { width: "8px", height: "8px", borderRadius: "50%", marginTop: "6px", flexShrink: 0 },
  insightText: { fontSize: "14px", lineHeight: "1.6", margin: 0 },

  groqBadge: {
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "#e9d5ff", fontSize: "10px", fontWeight: "700",
    padding: "3px 10px", borderRadius: "20px", letterSpacing: "1px",
    textTransform: "uppercase", flexShrink: 0,
  },
};

export default App;