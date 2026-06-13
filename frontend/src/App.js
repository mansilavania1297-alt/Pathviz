import React, { useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const INDUSTRIES = [
  {
    id: "marketing",
    label: "Marketing Analytics",
    description: "CAC, LTV, ROI, CTR for app and digital campaigns",
    columns: "spend, installs, revenue, active_users",
    icon: "📱",
  },
  {
    id: "stock",
    label: "Stock Market",
    description: "Returns, volatility, Sharpe ratio, win rate",
    columns: "date, close, volume",
    icon: "📈",
  },
  {
    id: "research",
    label: "Research Analytics",
    description: "h-index, citations, impact factor, funding trends",
    columns: "papers, citations, impact_factor",
    icon: "📚",
  },
  {
    id: "medical",
    label: "Medical Analytics",
    description: "Patient outcomes, readmission rates, cost per treatment",
    columns: "patients, readmissions, treatment_cost",
    icon: "🏥",
  },
  {
    id: "fintech",
    label: "FinTech Analytics",
    description: "Transaction volume, loan amounts, default rates",
    columns: "transactions, loan_amount, default_rate",
    icon: "💰",
  },
  {
    id: "hr",
    label: "HR Analytics",
    description: "Attrition, cost per hire, engagement scores",
    columns: "employees, attrition, cost_per_hire, time_to_hire, engagement_score",
    icon: "👥",
  },
  {
    id: "sales",
    label: "Sales Analytics",
    description: "Conversion rate, deal size, sales cycle",
    columns: "deal_size, status, sales_cycle_days",
    icon: "💼",
  },
  {
    id: "ecommerce",
    label: "E-commerce Analytics",
    description: "AOV, cart abandonment, return rate",
    columns: "order_value, cart_abandoned, returned, converted",
    icon: "🛒",
  },
];

const MOCK_APIS = [
  { id: "google_ads", label: "Google Ads",   color: "#4285f4", icon: "🔵" },
  { id: "meta_ads",   label: "Meta Ads",     color: "#1877f2", icon: "🔷" },
  { id: "hubspot",    label: "HubSpot CRM",  color: "#ff7a59", icon: "🟠" },
];

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [industry, setIndustry] = useState("marketing");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockSymbol, setStockSymbol] = useState("RELIANCE.NS");
  const [stockData, setStockData] = useState(null);
  const [trendKeyword, setTrendKeyword] = useState("");
  const [trendData, setTrendData] = useState(null);

  const selectedIndustry = INDUSTRIES.find((i) => i.id === industry);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
    setError(null);
  };

  const handleAnalyze = async (source = "upload", platform = "") => {
    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("industry", industry);

    if (source === "sample") {
      formData.append("use_sample", "true");
      if (!file) formData.append("file", new Blob(["placeholder"]), "placeholder.csv");
    } else if (source === "mock_api") {
      formData.append("mock_platform", platform);
      if (!file) formData.append("file", new Blob(["placeholder"]), "placeholder.csv");
    } else {
      if (!file) {
        setError("Please select a CSV file first.");
        setLoading(false);
        return;
      }
      formData.append("file", file);
    }

    try {
      const response = await axios.post(`${API_URL}/analyze`, formData);
      setResults(response.data);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Something went wrong. Check your CSV columns match the required format.");
    }
    setLoading(false);
  };

  const handleStockLookup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/stock/${stockSymbol}`);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setStockData(response.data);
      }
    } catch (err) {
      setError("Failed to fetch stock data. Check the symbol and try again.");
    }
    setLoading(false);
  };

  const handleTrendLookup = async () => {
    if (!trendKeyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trends/${encodeURIComponent(trendKeyword.trim())}`);
      setTrendData(response.data);
    } catch (err) {
      setError("Failed to fetch Google Trends data.");
    }
    setLoading(false);
  };

  return (
    <div style={S.container}>
      {/* ── Header ── */}
      <div style={S.header}>
        <h1 style={S.logo}>PathViz</h1>
        <p style={S.tagline}>AI-powered analytics for Indian growth teams</p>
        <span style={S.badge}>8 Industries · Real-time Stock · Google Trends · AI Insights</span>
      </div>

      {/* ── Industry Grid ── */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Select Your Industry</h2>
        <div style={S.industryGrid}>
          {INDUSTRIES.map((ind) => (
            <div
              key={ind.id}
              onClick={() => { setIndustry(ind.id); setResults(null); setError(null); }}
              style={{
                ...S.industryCard,
                ...(industry === ind.id ? S.industryCardActive : {}),
              }}
            >
              <span style={S.industryIcon}>{ind.icon}</span>
              <p style={S.industryLabel}>{ind.label}</p>
              <p style={S.industryDesc}>{ind.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stock Widget ── */}
      <div style={S.widget}>
        <h3 style={S.widgetTitle}>📈 Live Stock Data (NSE / BSE)</h3>
        <div style={S.inputRow}>
          <input
            type="text"
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStockLookup()}
            placeholder="e.g. RELIANCE.NS · TCS.NS · HDFCBANK.NS"
            style={S.textInput}
          />
          <button onClick={handleStockLookup} style={S.btnIndigo} disabled={loading}>
            Get Price
          </button>
        </div>
        {stockData && !stockData.error && (
          <div style={S.stockResult}>
            <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>
              {stockData.company_name} <span style={{ color: "#64748b", fontWeight: 400 }}>({stockData.symbol})</span>
            </p>
            <p style={S.stockPrice}>₹{stockData.current_price?.toLocaleString("en-IN")}</p>
            <p style={{ color: stockData.day_change >= 0 ? "#22c55e" : "#ef4444", margin: "4px 0 12px" }}>
              {stockData.day_change >= 0 ? "▲" : "▼"} ₹{Math.abs(stockData.day_change)} ({stockData.day_change_percent}%)
            </p>
            <div style={S.stockMeta}>
              <span>Vol: {stockData.volume?.toLocaleString("en-IN")}</span>
              <span>P/E: {stockData.pe_ratio || "—"}</span>
              <span>52W H: ₹{stockData.week_52_high}</span>
              <span>52W L: ₹{stockData.week_52_low}</span>
            </div>
            {stockData.prediction && (
              <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
                30-day trend: <strong style={{ color: stockData.prediction.trend === "increasing" ? "#22c55e" : "#ef4444" }}>{stockData.prediction.trend}</strong>
                {" "}· Confidence: {stockData.prediction.confidence}%
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Trends Widget ── */}
      <div style={S.widget}>
        <h3 style={S.widgetTitle}>🔍 Google Trends (India)</h3>
        <div style={S.inputRow}>
          <input
            type="text"
            value={trendKeyword}
            onChange={(e) => setTrendKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTrendLookup()}
            placeholder="e.g. upi · crypto · mutual funds · nifty50"
            style={S.textInput}
          />
          <button onClick={handleTrendLookup} style={S.btnGreen} disabled={loading}>
            Get Trends
          </button>
        </div>
        {trendData && (
          <div style={S.trendResult}>
            <p style={{ color: "#f1f5f9", margin: "0 0 4px" }}>
              Keyword: <strong>{trendData.keyword}</strong>
            </p>
            <p style={{ color: "#6366f1", fontSize: 24, fontWeight: 700, margin: "4px 0" }}>
              {trendData.current_interest}
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}> / 100 interest score</span>
            </p>
            <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>{trendData.source}</p>
          </div>
        )}
      </div>

      {/* ── Upload / Analyze Card ── */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>
          {selectedIndustry?.icon} Upload {selectedIndustry?.label} Data
        </h2>
        <p style={S.cardSubtitle}>
          Required columns:{" "}
          <strong style={{ color: "#6366f1" }}>{selectedIndustry?.columns}</strong>
        </p>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id="fileInput"
        />
        <label htmlFor="fileInput" style={S.fileLabel}>
          {file ? `📄 ${file.name}` : "Choose CSV or Excel file"}
        </label>

        <button
          onClick={() => handleAnalyze("upload")}
          style={loading ? S.btnDisabled : S.btnPrimary}
          disabled={loading}
        >
          {loading ? "Analyzing…" : `Analyze ${selectedIndustry?.label}`}
        </button>

        <div style={S.divider}>
          <span style={S.dividerText}>OR TRY WITHOUT UPLOADING</span>
        </div>

        <button onClick={() => handleAnalyze("sample")} style={S.btnOutline} disabled={loading}>
          🎲 Try Sample Data
        </button>

        {industry === "marketing" && (
          <div style={{ marginTop: 16 }}>
            <p style={S.mockTitle}>Connect Mock API</p>
            <div style={S.mockGrid}>
              {MOCK_APIS.map((api) => (
                <button
                  key={api.id}
                  onClick={() => handleAnalyze("mock_api", api.id)}
                  style={{ ...S.mockBtn, borderColor: api.color }}
                  disabled={loading}
                >
                  {api.icon} {api.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p style={S.errorText}>{error}</p>}
      </div>

      {/* ── Results ── */}
      {results && !results.error && (
        <div style={S.results}>
          <h2 style={S.resultsTitle}>
            {selectedIndustry?.icon} {selectedIndustry?.label} — Results
          </h2>

          {results.ai_used && (
            <div style={S.aiBadge}>🤖 AI-Powered Insights via Groq</div>
          )}

          {/* Metrics */}
          {results.metrics && Object.keys(results.metrics).length > 0 && (
            <div style={S.metricsGrid}>
              {Object.entries(results.metrics).map(([key, value]) => (
                <div key={key} style={S.metricCard}>
                  <p style={S.metricLabel}>{key}</p>
                  <p style={S.metricValue}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {results.chart_data && results.chart_data.length > 0 && (
            <div style={S.chartCard}>
              <h3 style={S.chartTitle}>📊 Your Performance vs India Benchmark</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={results.chart_data}
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      color: "#f1f5f9",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Yours"     fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="India Avg" fill="#475569" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Insights */}
          {results.insights && results.insights.length > 0 && (
            <div style={S.insightSection}>
              <h3 style={S.sectionSubTitle}>💡 Key Insights</h3>
              {results.insights.map((ins, i) => (
                <div key={i} style={S.insightCard}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color:
                        ins.status === "excellent" ? "#22c55e"
                        : ins.status === "warning"  ? "#f59e0b"
                        : "#818cf8",
                    }}
                  >
                    {ins.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Predictions */}
          {results.predictions && results.predictions.length > 0 && (
            <div style={S.insightSection}>
              <h3 style={S.sectionSubTitle}>🔮 Predictive Analytics</h3>
              {results.predictions.map((pred, i) => (
                <div key={i} style={S.insightCard}>
                  <p style={{ margin: 0, color: "#f1f5f9", fontWeight: 600 }}>{pred.metric}</p>
                  <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                    Trend: {pred.trend} ({pred.direction}) · Confidence: {pred.confidence}%
                  </p>
                  {pred.alert && (
                    <p style={{ margin: "4px 0 0", color: "#f59e0b", fontSize: 12 }}>{pred.alert}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p style={{ color: "#475569", fontSize: 11, textAlign: "center", marginTop: 16 }}>
            Source: {results.source}
          </p>
        </div>
      )}

      {/* Error from API result */}
      {results && results.error && (
        <div style={{ ...S.card, borderColor: "#ef4444" }}>
          <p style={S.errorText}>⚠️ {results.error}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const S = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    padding: "40px 20px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  header: { textAlign: "center", marginBottom: 40 },
  logo: { fontSize: 48, fontWeight: 800, color: "#6366f1", margin: 0, letterSpacing: -1 },
  tagline: { color: "#94a3b8", fontSize: 16, marginTop: 8 },
  badge: {
    color: "#22c55e",
    fontSize: 12,
    backgroundColor: "#1e293b",
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: 20,
    marginTop: 8,
  },

  /* Industry grid — 4 cols desktop, 2 cols on narrower screens via minmax */
  section: { maxWidth: 1200, margin: "0 auto 32px" },
  sectionTitle: { color: "#f1f5f9", fontSize: 20, marginBottom: 16 },
  industryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  industryCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    cursor: "pointer",
    border: "2px solid transparent",
    textAlign: "center",
    transition: "border-color 0.15s",
  },
  industryCardActive: { border: "2px solid #6366f1", backgroundColor: "#1e293b" },
  industryIcon: { fontSize: 26, display: "block", marginBottom: 8 },
  industryLabel: { color: "#f1f5f9", fontSize: 13, fontWeight: 600, margin: "0 0 6px" },
  industryDesc: { color: "#64748b", fontSize: 11, margin: 0, lineHeight: 1.4 },

  /* Widgets */
  widget: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    maxWidth: 900,
    margin: "0 auto 20px",
  },
  widgetTitle: { color: "#f1f5f9", fontSize: 18, margin: "0 0 16px" },
  inputRow: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  textInput: {
    flex: 1,
    minWidth: 200,
    padding: 12,
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f1f5f9",
    fontSize: 14,
    outline: "none",
  },
  btnIndigo: {
    padding: "12px 24px",
    backgroundColor: "#6366f1",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  btnGreen: {
    padding: "12px 24px",
    backgroundColor: "#22c55e",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  stockResult: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 12,
    textAlign: "center",
  },
  stockPrice: { fontSize: 32, fontWeight: 700, color: "#6366f1", margin: "4px 0" },
  stockMeta: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    fontSize: 12,
    color: "#94a3b8",
    flexWrap: "wrap",
  },
  trendResult: { backgroundColor: "#0f172a", padding: 16, borderRadius: 12 },

  /* Upload card */
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 32,
    maxWidth: 700,
    margin: "0 auto 40px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    border: "1px solid transparent",
  },
  cardTitle: { color: "#f1f5f9", fontSize: 22, margin: "0 0 8px" },
  cardSubtitle: { color: "#94a3b8", fontSize: 14, margin: "0 0 16px" },
  fileLabel: {
    display: "block",
    padding: "14px 20px",
    backgroundColor: "#0f172a",
    border: "2px dashed #334155",
    borderRadius: 10,
    color: "#94a3b8",
    cursor: "pointer",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 14,
  },
  btnPrimary: {
    width: "100%",
    padding: 14,
    backgroundColor: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 4,
  },
  btnDisabled: {
    width: "100%",
    padding: 14,
    backgroundColor: "#4338ca",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "not-allowed",
    opacity: 0.7,
  },
  divider: { display: "flex", alignItems: "center", margin: "20px 0" },
  dividerText: {
    color: "#334155",
    fontSize: 11,
    letterSpacing: 1,
    margin: "0 auto",
    backgroundColor: "#1e293b",
    padding: "0 12px",
  },
  btnOutline: {
    width: "100%",
    padding: 12,
    backgroundColor: "transparent",
    color: "#6366f1",
    border: "2px solid #6366f1",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 4,
  },
  mockTitle: { color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  mockGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  mockBtn: {
    padding: 10,
    backgroundColor: "transparent",
    color: "#f1f5f9",
    border: "2px solid",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  errorText: { color: "#f87171", fontSize: 14, marginTop: 12 },

  /* Results */
  results: { maxWidth: 900, margin: "0 auto 60px" },
  resultsTitle: { color: "#f1f5f9", fontSize: 24, textAlign: "center", marginBottom: 16 },
  aiBadge: {
    backgroundColor: "#6366f1",
    color: "#fff",
    padding: "6px 16px",
    borderRadius: 20,
    textAlign: "center",
    display: "inline-block",
    marginBottom: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    border: "1px solid #6366f1",
  },
  metricLabel: { color: "#94a3b8", fontSize: 11, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1 },
  metricValue: { color: "#6366f1", fontSize: 18, fontWeight: 700, margin: 0 },
  chartCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: { color: "#f1f5f9", fontSize: 16, margin: "0 0 16px" },
  insightSection: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionSubTitle: { color: "#f1f5f9", fontSize: 16, marginTop: 0, marginBottom: 12 },
  insightCard: {
    padding: 12,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    marginBottom: 8,
  },
};