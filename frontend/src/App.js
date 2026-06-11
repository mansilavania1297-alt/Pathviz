import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const INDUSTRIES = [
  { id: "marketing", label: "📱 Marketing Analytics", description: "CAC, LTV, ROI, CTR for app and digital campaigns", columns: "spend, installs, revenue, active_users" },
  { id: "stock", label: "📈 Stock Market Analysis", description: "Returns, volatility, Sharpe ratio, win rate", columns: "date, close, volume" },
  { id: "hr", label: "👥 HR Analytics", description: "Attrition, cost per hire, engagement scores", columns: "employees, attrition, cost_per_hire, time_to_hire, engagement_score" },
  { id: "sales", label: "💼 Sales Analytics", description: "Conversion rate, deal size, sales cycle", columns: "deal_size, status, sales_cycle_days" },
  { id: "ecommerce", label: "🛒 E-commerce Analytics", description: "AOV, cart abandonment, return rate", columns: "order_value, cart_abandoned, returned, converted" }
];

const MOCK_APIS = [
  { id: "google_ads", label: "Google Ads", color: "#4285f4", icon: "🔵" },
  { id: "meta_ads", label: "Meta Ads", color: "#1877f2", icon: "🔷" },
  { id: "hubspot", label: "HubSpot CRM", color: "#ff7a59", icon: "🟠" },
];

// Supabase configuration (move these to .env file for production)
const SUPABASE_URL = "https://fydfhzulozwjncbnmmwa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZGZoenVsb3p3am5jYm5tbXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDY3NTcsImV4cCI6MjA5NTQyMjc1N30.6JCeGDkmhMWBph02qK3_EgxjBjHfE43_MsXlrCTmLqo";

function App() {
  const [file, setFile] = useState(null);
  const [industry, setIndustry] = useState("marketing");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState("upload");
  const [history, setHistory] = useState([]);

  const selectedIndustry = INDUSTRIES.find(i => i.id === industry);

  // Fetch history from Supabase when component loads
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/analyses?select=*&order=created_at.desc&limit=10`, {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    
    fetchHistory();
  }, []); // Empty dependency array = runs once on mount

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
      const response = await axios.post("http://localhost:8000/analyze", formData);
      setResults(response.data);
      setDataSource(source === "mock_api" ? platform : source);
      
      // After successful analysis, refresh history
      const historyResponse = await fetch(`${SUPABASE_URL}/rest/v1/analyses?select=*&order=created_at.desc&limit=10`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      const historyData = await historyResponse.json();
      setHistory(historyData);
      
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Something went wrong. Check your CSV columns match the required format.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Pathviz</h1>
        <p style={styles.tagline}>AI-powered analytics for Indian growth teams</p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Select Your Industry</h2>
        <div style={styles.industryGrid}>
          {INDUSTRIES.map((ind) => (
            <div key={ind.id} onClick={() => { setIndustry(ind.id); setResults(null); setError(null); }}
              style={{ ...styles.industryCard, ...(industry === ind.id ? styles.industryCardActive : {}) }}>
              <p style={styles.industryLabel}>{ind.label}</p>
              <p style={styles.industryDesc}>{ind.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Upload {selectedIndustry.label} Data</h2>
        <p style={styles.cardSubtitle}>Required columns: <strong style={{ color: "#6366f1" }}>{selectedIndustry.columns}</strong></p>

        <div style={styles.uploadArea}>
          <input type="file" accept=".csv" onChange={handleFileChange} style={styles.fileInput} id="fileInput" />
          <label htmlFor="fileInput" style={styles.fileLabel}>
            {file ? `📄 ${file.name}` : "Choose CSV File"}
          </label>
        </div>

        <button onClick={() => handleAnalyze("upload")}
          style={loading ? styles.buttonLoading : styles.button} disabled={loading}>
          {loading ? "Analyzing..." : `Analyze ${selectedIndustry.label}`}
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

      {results && (
        <div style={styles.resultsContainer}>
          <h2 style={styles.resultsTitle}>{selectedIndustry.label} — Analysis Results</h2>

          {dataSource !== "upload" && (
            <div style={styles.dataSourceBadge}>
              {dataSource === "sample" && "🎲 Using Sample Data"}
              {dataSource === "google_ads" && "🔵 Data from Mock Google Ads API"}
              {dataSource === "meta_ads" && "🔷 Data from Mock Meta Ads API"}
              {dataSource === "hubspot" && "🟠 Data from Mock HubSpot CRM API"}
            </div>
          )}

          <div style={styles.metricsGrid}>
            {results.metrics && Object.entries(results.metrics).map(([key, value]) => (
              <div key={key} style={styles.metricCard}>
                <p style={styles.metricLabel}>{key}</p>
                <p style={styles.metricValue}>{value}</p>
              </div>
            ))}
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Performance vs India Benchmark</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.chart_data || []} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }} />
                <Legend />
                <Bar dataKey="Yours" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="India Avg" fill="#475569" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Benchmark" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {results.predictions && results.predictions.length > 0 && (
            <div style={styles.predictionSection}>
              <h3 style={styles.predictionTitle}>🔮 Predictive Analytics</h3>
              <p style={styles.predictionSubtitle}>
                Based on linear regression analysis of your data
              </p>
              {results.predictions.map((pred, index) => (
                <div key={index} style={styles.predictionCard}>
                  <div style={styles.predictionHeader}>
                    <span style={styles.predictionMetric}>{pred.metric}</span>
                    <span style={{
                      ...styles.predictionTrend,
                      color: pred.trend === "increasing" ? "#22c55e" : "#f59e0b"
                    }}>
                      {pred.direction} {pred.trend.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.predictionValues}>
                    {pred.values.map((val, i) => (
                      <div key={i} style={styles.predictionValue}>
                        <p style={styles.predictionMonth}>Month {i + 1}</p>
                        <p style={styles.predictionAmount}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{
                    ...styles.predictionAlert,
                    color: pred.trend === "increasing" &&
                      pred.metric.includes("CAC") ? "#f59e0b" :
                      pred.trend === "increasing" ? "#22c55e" : "#f59e0b"
                  }}>
                    {pred.alert}
                  </p>
                  <p style={styles.predictionConfidence}>
                    Model confidence: {pred.confidence}%
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={styles.benchmarkSection}>
            <h3 style={styles.benchmarkSectionTitle}>India Benchmark Analysis</h3>
            <p style={styles.benchmarkSource}>Source: {results.source || "Industry Report"}</p>
            {results.insights && results.insights.map((insight, index) => (
              <div key={index} style={styles.benchmarkRow}>
                <p style={{ ...styles.benchmarkMessage, color: insight.status === "excellent" ? "#22c55e" : "#f59e0b" }}>
                  {insight.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ maxWidth: "900px", margin: "0 auto 40px auto" }}>
          <h2 style={{ color: "#f1f5f9", fontSize: "20px", marginBottom: "16px" }}>📋 Past Analyses</h2>
          {history.map((item) => (
            <div key={item.id} style={{
              backgroundColor: "#1e293b",
              borderRadius: "10px",
              padding: "14px 20px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ color: "#f1f5f9", fontWeight: "600", textTransform: "capitalize" }}>
                🏭 {item.industry}
              </span>
              <span style={{ color: "#64748b", fontSize: "13px" }}>
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
          ))}
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
  section: { maxWidth: "900px", margin: "0 auto 32px auto" },
  sectionTitle: { color: "#f1f5f9", fontSize: "20px", marginBottom: "16px" },
  industryGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" },
  industryCard: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "16px", cursor: "pointer", border: "2px solid transparent" },
  industryCardActive: { border: "2px solid #6366f1" },
  industryLabel: { color: "#f1f5f9", fontSize: "13px", fontWeight: "600", margin: "0 0 6px 0" },
  industryDesc: { color: "#64748b", fontSize: "11px", margin: "0", lineHeight: "1.4" },
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
  dataSourceBadge: { backgroundColor: "#1e293b", border: "1px solid #6366f1", borderRadius: "8px", padding: "10px 16px", textAlign: "center", color: "#6366f1", fontSize: "14px", marginBottom: "24px" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" },
  metricCard: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "20px", textAlign: "center", border: "1px solid #6366f1" },
  metricLabel: { color: "#94a3b8", fontSize: "12px", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "1px" },
  metricValue: { color: "#6366f1", fontSize: "24px", fontWeight: "700", margin: "0" },
  chartCard: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "16px" },
  chartTitle: { color: "#f1f5f9", fontSize: "16px", margin: "0 0 20px 0" },
  benchmarkSection: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "16px" },
  benchmarkSectionTitle: { color: "#f1f5f9", fontSize: "18px", margin: "0 0 4px 0" },
  benchmarkSource: { color: "#475569", fontSize: "12px", margin: "0 0 20px 0" },
  benchmarkRow: { marginBottom: "12px" },
  benchmarkMessage: { fontSize: "14px", lineHeight: "1.5", margin: "0" },
  predictionSection: { backgroundColor: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "16px" },
  predictionTitle: { color: "#f1f5f9", fontSize: "18px", margin: "0 0 4px 0" },
  predictionSubtitle: { color: "#475569", fontSize: "12px", margin: "0 0 20px 0" },
  predictionCard: { backgroundColor: "#0f172a", borderRadius: "10px", padding: "16px", marginBottom: "12px" },
  predictionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  predictionMetric: { color: "#f1f5f9", fontSize: "14px", fontWeight: "600" },
  predictionTrend: { fontSize: "12px", fontWeight: "700", letterSpacing: "1px" },
  predictionValues: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "12px" },
  predictionValue: { textAlign: "center", backgroundColor: "#1e293b", borderRadius: "8px", padding: "10px" },
  predictionMonth: { color: "#475569", fontSize: "11px", margin: "0 0 4px 0" },
  predictionAmount: { color: "#6366f1", fontSize: "16px", fontWeight: "700", margin: "0" },
  predictionAlert: { fontSize: "13px", margin: "0 0 6px 0", fontWeight: "600" },
  predictionConfidence: { color: "#475569", fontSize: "11px", margin: "0" },
};

export default App;