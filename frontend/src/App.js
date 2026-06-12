import React, { useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// Updated INDUSTRIES with all 8 verticals
const INDUSTRIES = [
  { id: "marketing", label: "📱 Marketing Analytics", description: "CAC, LTV, ROI, CTR for app and digital campaigns", columns: "spend, installs, revenue, active_users", icon: "📊" },
  { id: "stock", label: "📈 Stock Market Analysis", description: "Returns, volatility, Sharpe ratio, win rate", columns: "date, close, volume", icon: "📉" },
  { id: "research", label: "📚 Research Analytics", description: "h-index, citations, impact factor, funding trends", columns: "papers, citations, impact_factor", icon: "🔬" },
  { id: "medical", label: "🏥 Medical Analytics", description: "Patient outcomes, readmission rates, cost per treatment", columns: "patients, readmissions, treatment_cost", icon: "💊" },
  { id: "fintech", label: "💰 FinTech Analytics", description: "Transaction volume, loan amounts, default rates", columns: "transactions, loan_amount, default_rate", icon: "💳" },
  { id: "hr", label: "👥 HR Analytics", description: "Attrition, cost per hire, engagement scores", columns: "employees, attrition, cost_per_hire, time_to_hire, engagement_score", icon: "👔" },
  { id: "sales", label: "💼 Sales Analytics", description: "Conversion rate, deal size, sales cycle", columns: "deal_size, status, sales_cycle_days", icon: "🎯" },
  { id: "ecommerce", label: "🛒 E-commerce Analytics", description: "AOV, cart abandonment, return rate", columns: "order_value, cart_abandoned, returned, converted", icon: "🛍️" }
];

const MOCK_APIS = [
  { id: "google_ads", label: "Google Ads", color: "#4285f4", icon: "🔵" },
  { id: "meta_ads", label: "Meta Ads", color: "#1877f2", icon: "🔷" },
  { id: "hubspot", label: "HubSpot CRM", color: "#ff7a59", icon: "🟠" },
];

// Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function App() {
  const [file, setFile] = useState(null);
  const [industry, setIndustry] = useState("marketing");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState("upload");
  const [history, setHistory] = useState([]);
  const [stockSymbol, setStockSymbol] = useState("RELIANCE.NS");
  const [stockData, setStockData] = useState(null);
  const [trendKeyword, setTrendKeyword] = useState("");
  const [trendData, setTrendData] = useState(null);

  const selectedIndustry = INDUSTRIES.find(i => i.id === industry);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
    setError(null);
    setDataSource("upload");
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
      if (!file) { setError("Please select a CSV file first."); setLoading(false); return; }
      formData.append("file", file);
    }

    try {
      const response = await axios.post(`${API_URL}/analyze`, formData);
      setResults(response.data);
      setDataSource(source === "mock_api" ? platform : source);
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
      setStockData(response.data);
    } catch (err) {
      setError("Failed to fetch stock data");
    }
    setLoading(false);
  };

  const handleTrendLookup = async () => {
    if (!trendKeyword) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/trends/${trendKeyword}`);
      setTrendData(response.data);
    } catch (err) {
      setError("Failed to fetch trends data");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>PathViz</h1>
        <p style={styles.tagline}>AI-powered analytics for Indian growth teams</p>
        <p style={styles.badge}>8 Industries • Real-time Stock • Google Trends • AI Insights</p>
      </div>

      {/* Industries Grid */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Select Your Industry</h2>
        <div style={styles.industryGrid}>
          {INDUSTRIES.map((ind) => (
            <div key={ind.id} onClick={() => { setIndustry(ind.id); setResults(null); setError(null); }}
              style={{ ...styles.industryCard, ...(industry === ind.id ? styles.industryCardActive : {}) }}>
              <span style={styles.industryIcon}>{ind.icon}</span>
              <p style={styles.industryLabel}>{ind.label}</p>
              <p style={styles.industryDesc}>{ind.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Market Live Widget */}
      <div style={styles.stockWidget}>
        <h3 style={styles.widgetTitle}>📈 Live Stock Data (NSE/BSE)</h3>
        <div style={styles.stockInputGroup}>
          <input
            type="text"
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value)}
            placeholder="Enter symbol (e.g., RELIANCE.NS, TCS.NS, HDFCBANK.NS)"
            style={styles.stockInput}
          />
          <button onClick={handleStockLookup} style={styles.stockButton}>
            Get Live Price
          </button>
        </div>
        {stockData && (
          <div style={styles.stockResult}>
            <p><strong>{stockData.company_name}</strong> ({stockData.symbol})</p>
            <p style={styles.stockPrice}>₹{stockData.current_price}</p>
            <p style={{ color: stockData.day_change >= 0 ? '#22c55e' : '#ef4444' }}>
              {stockData.day_change >= 0 ? '▲' : '▼'} {stockData.day_change} ({stockData.day_change_percent}%)
            </p>
            <div style={styles.stockMetrics}>
              <span>Volume: {stockData.volume?.toLocaleString()}</span>
              <span>P/E: {stockData.pe_ratio}</span>
              <span>52W H/L: {stockData.week_52_high} / {stockData.week_52_low}</span>
            </div>
          </div>
        )}
      </div>

      {/* Google Trends Widget */}
      <div style={styles.trendWidget}>
        <h3 style={styles.widgetTitle}>🔍 Google Trends</h3>
        <div style={styles.trendInputGroup}>
          <input
            type="text"
            value={trendKeyword}
            onChange={(e) => setTrendKeyword(e.target.value)}
            placeholder="Enter keyword (e.g., 'upi', 'crypto', 'mutual funds')"
            style={styles.trendInput}
          />
          <button onClick={handleTrendLookup} style={styles.trendButton}>
            Get Trends
          </button>
        </div>
        {trendData && (
          <div style={styles.trendResult}>
            <p><strong>Keyword:</strong> {trendData.keyword}</p>
            <p><strong>Current Interest:</strong> {trendData.current_interest}</p>
            <p style={styles.trendNote}>{trendData.source}</p>
          </div>
        )}
      </div>

      {/* Analysis Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Upload {selectedIndustry?.label} Data</h2>
        <p style={styles.cardSubtitle}>Required columns: <strong style={{ color: "#6366f1" }}>{selectedIndustry?.columns}</strong></p>

        <div style={styles.uploadArea}>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={styles.fileInput} id="fileInput" />
          <label htmlFor="fileInput" style={styles.fileLabel}>
            {file ? `📄 ${file.name}` : "Choose CSV or Excel File"}
          </label>
        </div>

        <button onClick={() => handleAnalyze("upload")}
          style={loading ? styles.buttonLoading : styles.button} disabled={loading}>
          {loading ? "Analyzing..." : `Analyze ${selectedIndustry?.label}`}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR TRY WITHOUT UPLOADING</span>
        </div>

        <button onClick={() => handleAnalyze("sample")}
          style={styles.sampleButton} disabled={loading}>
          🎲 Try Sample Data
        </button>

        {industry === "marketing" && (
          <div style={styles.mockApiSection}>
            <p style={styles.mockApiTitle}>Connect Mock API</p>
            <div style={styles.mockApiGrid}>
              {MOCK_APIS.map((api) => (
                <button key={api.id} onClick={() => handleAnalyze("mock_api", api.id)}
                  style={{ ...styles.mockApiButton, borderColor: api.color }} disabled={loading}>
                  {api.icon} {api.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* Results Section */}
      {results && (
        <div style={styles.resultsContainer}>
          <h2 style={styles.resultsTitle}>{selectedIndustry?.label} — Analysis Results</h2>

          {results.ai_used && (
            <div style={styles.aiBadge}>🤖 AI-Powered Insights</div>
          )}

          <div style={styles.metricsGrid}>
            {results.metrics && Object.entries(results.metrics).map(([key, value]) => (
              <div key={key} style={styles.metricCard}>
                <p style={styles.metricLabel}>{key}</p>
                <p style={styles.metricValue}>{value}</p>
              </div>
            ))}
          </div>

          {results.chart_data && results.chart_data.length > 0 && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Performance vs India Benchmark</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.chart_data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }} />
                  <Legend />
                  <Bar dataKey="Yours" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="India Avg" fill="#475569" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {results.insights && results.insights.length > 0 && (
            <div style={styles.insightsSection}>
              <h3 style={styles.insightsTitle}>💡 Key Insights</h3>
              {results.insights.map((insight, index) => (
                <div key={index} style={styles.insightCard}>
                  <p style={{ ...styles.insightMessage, color: insight.status === "excellent" ? "#22c55e" : insight.status === "warning" ? "#f59e0b" : "#6366f1" }}>
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {results.predictions && results.predictions.length > 0 && (
            <div style={styles.predictionsSection}>
              <h3 style={styles.predictionsTitle}>🔮 Predictive Analytics</h3>
              {results.predictions.map((pred, index) => (
                <div key={index} style={styles.predictionCard}>
                  <p><strong>{pred.metric}</strong></p>
                  <p>Trend: {pred.trend} ({pred.direction})</p>
                  <p>Confidence: {pred.confidence}%</p>
                  <p style={styles.predictionAlert}>{pred.alert}</p>
                </div>
              ))}
            </div>
          )}

          <div style={styles.sourceSection}>
            <p style={styles.sourceText}>Source: {results.source}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#0f172a", padding: "40px 20px", fontFamily: "'Segoe UI', sans-serif" },
  header: { textAlign: "center", marginBottom: "40px" },
  logo: { fontSize: "48px", fontWeight: "800", color: "#6366f1", margin: "0", letterSpacing: "-1px" },
  tagline: { color: "#94a3b8", fontSize: "16px", marginTop: "8px" },
  badge: { color: "#22c55e", fontSize: "12px", marginTop: "8px", backgroundColor: "#1e293b", display: "inline-block", padding: "4px 12px", borderRadius: "20px" },
  section: { maxWidth: "1200px", margin: "0 auto 32px auto" },
  sectionTitle: { color: "#f1f5f9", fontSize: "20px", marginBottom: "16px" },
  industryGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" },
  industryCard: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "16px", cursor: "pointer", border: "2px solid transparent", textAlign: "center" },
  industryCardActive: { border: "2px solid #6366f1", backgroundColor: "#1e293b" },
  industryIcon: { fontSize: "24px", display: "block", marginBottom: "8px" },
  industryLabel: { color: "#f1f5f9", fontSize: "13px", fontWeight: "600", margin: "0 0 6px 0" },
  industryDesc: { color: "#64748b", fontSize: "11px", margin: "0", lineHeight: "1.4" },
  stockWidget: { backgroundColor: "#1e293b", borderRadius: "16px", padding: "20px", maxWidth: "900px", margin: "0 auto 20px auto" },
  trendWidget: { backgroundColor: "#1e293b", borderRadius: "16px", padding: "20px", maxWidth: "900px", margin: "0 auto 20px auto" },
  widgetTitle: { color: "#f1f5f9", fontSize: "18px", marginBottom: "16px" },
  stockInputGroup: { display: "flex", gap: "10px", marginBottom: "16px" },
  stockInput: { flex: 1, padding: "12px", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" },
  stockButton: { padding: "12px 24px", backgroundColor: "#6366f1", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "600" },
  stockResult: { backgroundColor: "#0f172a", padding: "16px", borderRadius: "12px", textAlign: "center" },
  stockPrice: { fontSize: "32px", fontWeight: "700", color: "#6366f1", margin: "8px 0" },
  stockMetrics: { display: "flex", justifyContent: "center", gap: "16px", marginTop: "12px", fontSize: "12px", color: "#94a3b8" },
  trendInputGroup: { display: "flex", gap: "10px", marginBottom: "16px" },
  trendInput: { flex: 1, padding: "12px", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" },
  trendButton: { padding: "12px 24px", backgroundColor: "#22c55e", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "600" },
  trendResult: { backgroundColor: "#0f172a", padding: "16px", borderRadius: "12px" },
  trendNote: { fontSize: "11px", color: "#64748b", marginTop: "8px" },
  card: { backgroundColor: "#1e293b", borderRadius: "16px", padding: "32px", maxWidth: "700px", margin: "0 auto 40px auto", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" },
  cardTitle: { color: "#f1f5f9", fontSize: "22px", margin: "0 0 8px 0" },
  cardSubtitle: { color: "#94a3b8", fontSize: "14px", margin: "0 0 16px 0" },
  uploadArea: { marginBottom: "16px" },
  fileInput: { display: "none" },
  fileLabel: { display: "block", padding: "14px 20px", backgroundColor: "#0f172a", border: "2px dashed #334155", borderRadius: "10px", color: "#94a3b8", cursor: "pointer", textAlign: "center", fontSize: "14px" },
  button: { width: "100%", padding: "14px", backgroundColor: "#6366f1", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" },
  buttonLoading: { width: "100%", padding: "14px", backgroundColor: "#4338ca", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "not-allowed" },
  divider: { display: "flex", alignItems: "center", margin: "20px 0" },
  dividerText: { color: "#334155", fontSize: "11px", letterSpacing: "1px", margin: "0 auto", backgroundColor: "#1e293b", padding: "0 12px" },
  sampleButton: { width: "100%", padding: "12px", backgroundColor: "transparent", color: "#6366f1", border: "2px solid #6366f1", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginBottom: "16px" },
  mockApiSection: { marginTop: "8px" },
  mockApiTitle: { color: "#94a3b8", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" },
  mockApiGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" },
  mockApiButton: { padding: "10px", backgroundColor: "transparent", color: "#f1f5f9", border: "2px solid", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  error: { color: "#f87171", fontSize: "14px", marginTop: "12px" },
  resultsContainer: { maxWidth: "900px", margin: "0 auto" },
  resultsTitle: { color: "#f1f5f9", fontSize: "24px", textAlign: "center", marginBottom: "16px" },
  aiBadge: { backgroundColor: "#6366f1", color: "white", padding: "8px 16px", borderRadius: "20px", textAlign: "center", display: "inline-block", marginBottom: "20px", fontSize: "12px" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" },
  metricCard: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "16px", textAlign: "center", border: "1px solid #6366f1" },
  metricLabel: { color: "#94a3b8", fontSize: "11px", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "1px" },
  metricValue: { color: "#6366f1", fontSize: "18px", fontWeight: "700", margin: "0" },
  chartCard: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", marginBottom: "20px" },
  chartTitle: { color: "#f1f5f9", fontSize: "16px", margin: "0 0 16px 0" },
  insightsSection: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", marginBottom: "20px" },
  insightsTitle: { color: "#f1f5f9", fontSize: "16px", marginBottom: "12px" },
  insightCard: { padding: "12px", backgroundColor: "#0f172a", borderRadius: "8px", marginBottom: "8px" },
  insightMessage: { fontSize: "13px", margin: "0", lineHeight: "1.5" },
  predictionsSection: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", marginBottom: "20px" },
  predictionsTitle: { color: "#f1f5f9", fontSize: "16px", marginBottom: "12px" },
  predictionCard: { backgroundColor: "#0f172a", borderRadius: "8px", padding: "12px", marginBottom: "8px" },
  predictionAlert: { color: "#f59e0b", fontSize: "12px", marginTop: "6px" },
  sourceSection: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "12px", textAlign: "center" },
  sourceText: { color: "#64748b", fontSize: "11px", margin: "0" }
};

export default App;