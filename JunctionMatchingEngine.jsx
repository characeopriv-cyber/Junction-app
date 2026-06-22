import { useState } from "react";

const mockProperties = [
  { id: 1, title: "2BR in Downtown Dubai", area: "Downtown Dubai", price: 12000, type: "Apartment", beds: 2, tags: ["Metro Access", "Furnished", "High Floor"] },
  { id: 2, title: "Studio in JVC", area: "Jumeirah Village Circle", price: 5500, type: "Studio", beds: 0, tags: ["New Building", "Gym", "Pool"] },
  { id: 3, title: "3BR Villa in Arabian Ranches", area: "Arabian Ranches", price: 22000, type: "Villa", beds: 3, tags: ["Garden", "Quiet", "Family"] },
  { id: 4, title: "1BR in Marina", area: "Dubai Marina", price: 9500, type: "Apartment", beds: 1, tags: ["Sea View", "Metro Access", "Furnished"] },
  { id: 5, title: "4BR Villa in Jumeirah", area: "Jumeirah", price: 38000, type: "Villa", beds: 4, tags: ["Private Pool", "Garden", "Beach Access"] },
  { id: 6, title: "2BR in Business Bay", area: "Business Bay", price: 13500, type: "Apartment", beds: 2, tags: ["Canal View", "High Floor", "Metro Access"] },
];

const AREAS = ["Downtown Dubai", "Dubai Marina", "Jumeirah Village Circle", "Arabian Ranches", "Jumeirah", "Business Bay"];
const TYPES = ["Apartment", "Studio", "Villa"];

function scoreMatch(property, prefs) {
  let score = 0;
  let reasons = [];

  if (prefs.budget && property.price <= parseInt(prefs.budget)) {
    score += 30;
    reasons.push("Within budget");
  } else if (prefs.budget && property.price <= parseInt(prefs.budget) * 1.1) {
    score += 15;
    reasons.push("Slightly above budget");
  }

  if (prefs.area && property.area === prefs.area) {
    score += 25;
    reasons.push("Preferred area");
  }

  if (prefs.type && property.type === prefs.type) {
    score += 20;
    reasons.push("Preferred type");
  }

  if (prefs.beds !== "" && parseInt(prefs.beds) === property.beds) {
    score += 15;
    reasons.push("Bedroom match");
  }

  if (prefs.metro && property.tags.includes("Metro Access")) {
    score += 10;
    reasons.push("Metro access");
  }

  if (prefs.furnished && property.tags.includes("Furnished")) {
    score += 10;
    reasons.push("Furnished");
  }

  return { score: Math.min(score, 100), reasons };
}

function MatchBar({ score }) {
  const color = score >= 70 ? "#C9A84C" : score >= 40 ? "#4a90d9" : "#999";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <div style={{ flex: 1, height: 5, background: "#e8e4dc", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 10, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{score}%</span>
    </div>
  );
}

function PropertyCard({ property, score, reasons, rank }) {
  const isTop = rank === 1;
  return (
    <div style={{
      background: isTop ? "linear-gradient(135deg, #0a1628 0%, #162040 100%)" : "#fff",
      border: isTop ? "2px solid #C9A84C" : "1px solid #e8e4dc",
      borderRadius: 14,
      padding: "18px 20px",
      position: "relative",
      transition: "transform 0.2s",
      color: isTop ? "#fff" : "#1a1a2e",
    }}>
      {isTop && (
        <div style={{
          position: "absolute", top: -11, left: 16,
          background: "#C9A84C", color: "#fff",
          fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
          padding: "3px 10px", borderRadius: 20
        }}>BEST MATCH</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{property.title}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{property.area}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: isTop ? "#C9A84C" : "#0a1628" }}>
            AED {property.price.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>/month</div>
        </div>
      </div>
      <MatchBar score={score} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
        {reasons.map(r => (
          <span key={r} style={{
            fontSize: 11, padding: "3px 9px", borderRadius: 20,
            background: isTop ? "rgba(201,168,76,0.2)" : "#f0ede6",
            color: isTop ? "#C9A84C" : "#555", fontWeight: 600
          }}>{r}</span>
        ))}
        {property.tags.map(t => (
          <span key={t} style={{
            fontSize: 11, padding: "3px 9px", borderRadius: 20,
            background: isTop ? "rgba(255,255,255,0.08)" : "#f8f7f4",
            color: isTop ? "rgba(255,255,255,0.6)" : "#888"
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function JunctionMatchingEngine() {
  const [prefs, setPrefs] = useState({ budget: "", area: "", type: "", beds: "", metro: false, furnished: false });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const runMatch = () => {
    setLoading(true);
    setTimeout(() => {
      const scored = mockProperties.map(p => {
        const { score, reasons } = scoreMatch(p, prefs);
        return { ...p, score, reasons };
      }).sort((a, b) => b.score - a.score);
      setResults(scored);
      setLoading(false);
    }, 900);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid #ddd", fontSize: 14, background: "#fafaf8",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit"
  };

  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5, display: "block", letterSpacing: 0.5 };

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#f5f2ec", minHeight: "100vh", padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{ background: "#0a1628", padding: "24px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
          <span style={{ color: "#C9A84C", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>JUNCTION</span>
        </div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>AI Matching</div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>
          Tell us what you need. We find the right fit.
        </div>
      </div>

      {/* Preferences Form */}
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>MAX MONTHLY BUDGET (AED)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 15000"
                value={prefs.budget} onChange={e => set("budget", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>PREFERRED AREA</label>
              <select style={inputStyle} value={prefs.area} onChange={e => set("area", e.target.value)}>
                <option value="">Any area</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>PROPERTY TYPE</label>
              <select style={inputStyle} value={prefs.type} onChange={e => set("type", e.target.value)}>
                <option value="">Any type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>BEDROOMS</label>
              <select style={inputStyle} value={prefs.beds} onChange={e => set("beds", e.target.value)}>
                <option value="">Any</option>
                <option value="0">Studio</option>
                <option value="1">1 Bed</option>
                <option value="2">2 Beds</option>
                <option value="3">3 Beds</option>
                <option value="4">4+ Beds</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
              {[["metro", "Metro Access"], ["furnished", "Furnished"]].map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div onClick={() => set(key, !prefs[key])} style={{
                    width: 36, height: 20, borderRadius: 10, background: prefs[key] ? "#C9A84C" : "#ddd",
                    position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0
                  }}>
                    <div style={{
                      position: "absolute", top: 2, left: prefs[key] ? 18 : 2,
                      width: 16, height: 16, borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#444" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={runMatch} disabled={loading} style={{
            width: "100%", marginTop: 18, padding: "14px",
            background: loading ? "#ccc" : "#0a1628",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
            letterSpacing: 0.5, transition: "background 0.2s"
          }}>
            {loading ? "Finding your matches..." : "Find My Match →"}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div style={{ padding: "24px 20px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 14 }}>
            {results.filter(r => r.score > 0).length} MATCHES FOUND
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((p, i) => (
              <PropertyCard key={p.id} property={p} score={p.score} reasons={p.reasons} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
