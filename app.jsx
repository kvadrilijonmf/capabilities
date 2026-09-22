const { useState, useEffect, useMemo } = React;

const FACETS = [
  { key: "industries", label: "Industry" },
  { key: "projectTypes", label: "Project Type" },
  { key: "departments", label: "Department" },
  { key: "expertise", label: "Expertise" },
];

// Static "Other" legends per facet - shown as a hover tooltip on the "Other" pill.
const OTHER_LEGEND = {
  industries: "Utilities, Construction, Infrastructure, Public Sector",
  projectTypes:
    "Workforce Utilisation, Category Management, Supply Chain, PMO, Pricing, Tool Development, Transformation",
  departments: "Administration, Sourcing, Legal, IT",
  expertise:
    "PMO, Capability Assessment, Capacity Management, Performance Management, Market Assessment, Commercial Strategy, Process Modelling, Model Development, Insights, Change Management",
};

const INDUSTRY_ICONS = {
  "Consumer Goods": "🛒",
  Retail: "🏬",
  Logistics: "🚚",
  Telco: "📡",
  Banking: "🏦",
  Healthcare: "🏥",
  Media: "📺",
  Other: "🔹",
};

const PROJECT_TYPE_ICONS = {
  "Process Optimisation": "⚙️",
  Assessment: "🔍",
  "Commercial Improvement": "💹",
  Strategy: "♟️",
  "Performance Improvement": "📈",
  Implementation: "🛠️",
  "Sales Enhancement": "🤝",
  "Process Design": "🧩",
  Restructuring: "🔄",
  "Organisation Design": "🏛️",
  "Market Entry": "🚀",
  "Cost Reduction": "✂️",
  Other: "🔹",
};

const DEPARTMENT_ICONS = {
  Sales: "🤝",
  Strategy: "♟️",
  Finance: "💵",
  Operations: "🏭",
  Commercial: "💼",
  "Supply Chain": "🚚",
  HR: "👥",
  Manufacturing: "🏗️",
  Procurement: "📦",
  "Company-wide": "🌐",
  Marketing: "📣",
  Other: "🔹",
};

const EXPERTISE_ICONS = {
  "Data & Analytics": "📊",
  "Tool Development": "🧰",
  "Strategic Assessment": "🔍",
  "Process Optimisation": "⚙️",
  Automation: "🤖",
  "Scenario Modelling": "🧮",
  "Process Design": "🧩",
  "Financial Modelling": "📉",
  "Commercial Effectiveness": "💹",
  "Organisation Design": "🏛️",
  "Cost Allocation & Profitability": "💰",
  Pricing: "🏷️",
  "Supply Chain Optimisation": "🚚",
  "Workforce Utilisation": "👥",
  Leadership: "🧭",
  "Process Implementation": "🛠️",
  "Client Management": "🤝",
  Strategy: "♟️",
  "Project Management": "🗂️",
  "Supplier Negotiations": "🤝",
  "Supplier Negotiation": "🤝",
  "Sales Enhancement": "📈",
  "Training & Capability Development": "🎓",
  "Financial Impact Modelling": "📉",
  Transformation: "🔄",
  Procurement: "📦",
  Other: "🔹",
};

const FACET_ICONS = {
  industries: INDUSTRY_ICONS,
  projectTypes: PROJECT_TYPE_ICONS,
  departments: DEPARTMENT_ICONS,
  expertise: EXPERTISE_ICONS,
};

function rankedValues(facetKey, pool) {
  const counts = {};
  pool.forEach((p) => {
    p[facetKey].forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // "Other" always goes last, regardless of its count.
  entries.sort((a, b) => (a[0] === "Other") - (b[0] === "Other"));
  return entries.map(([value, count]) => ({ value, count }));
}

function passesOtherFacets(p, selected, excludeKey) {
  return FACETS.every((f) => {
    if (f.key === excludeKey) return true;
    const chosen = selected[f.key];
    if (chosen.length === 0) return true;
    return p[f.key].some((v) => chosen.includes(v));
  });
}

function passesAllFacets(p, selected) {
  return FACETS.every((f) => {
    const chosen = selected[f.key];
    if (chosen.length === 0) return true;
    return p[f.key].some((v) => chosen.includes(v));
  });
}

function searchScore(project, words) {
  if (words.length === 0) return 0;
  const haystack = (project.searchText + " " + project.name).toLowerCase();
  let score = 0;
  for (const w of words) {
    if (haystack.includes(w)) score++;
  }
  return score;
}

function Tooltip({ text, anchorRect }) {
  if (!anchorRect) return null;
  const style = {
    position: "fixed",
    top: anchorRect.bottom + 6,
    left: Math.min(anchorRect.left, window.innerWidth - 420),
    maxWidth: 400,
    background: "#1f2937",
    color: "#f9fafb",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 12.5,
    lineHeight: 1.5,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    zIndex: 50,
    pointerEvents: "none",
  };
  return <div style={style}>{text}</div>;
}

function ProjectFilter({ projects }) {
  const [selected, setSelected] = useState({
    industries: [],
    projectTypes: [],
    departments: [],
    expertise: [],
  });
  const [query, setQuery] = useState("");
  // Unified hover state for both project rows and "Other" pills.
  const [hover, setHover] = useState(null); // { text, rect }

  const queryWords = useMemo(
    () =>
      query
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean),
    [query]
  );
  const searching = queryWords.length > 0;

  const facetOptions = useMemo(() => {
    const out = {};
    FACETS.forEach((f) => {
      let pool = projects.filter((p) => passesOtherFacets(p, selected, f.key));
      if (searching) {
        pool = pool.filter((p) => searchScore(p, queryWords) > 0);
      }
      const ranked = rankedValues(f.key, pool);
      selected[f.key].forEach((v) => {
        if (!ranked.some((r) => r.value === v)) ranked.push({ value: v, count: 0 });
      });
      out[f.key] = ranked;
    });
    return out;
  }, [selected, projects, searching, queryWords]);

  function toggle(facetKey, value) {
    setSelected((prev) => {
      const cur = prev[facetKey];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [facetKey]: next };
    });
  }

  function clearAll() {
    setSelected({ industries: [], projectTypes: [], departments: [], expertise: [] });
    setQuery("");
  }

  const totalSelected = FACETS.reduce((n, f) => n + selected[f.key].length, 0);
  const active = totalSelected > 0 || searching;

  // Items shown in the results heading: every selected tag, in facet order,
  // plus the search query (quoted) if present.
  const headingItems = useMemo(() => {
    const items = [];
    FACETS.forEach((f) => items.push(...selected[f.key]));
    if (searching) items.push(`"${query.trim()}"`);
    return items;
  }, [selected, searching, query]);

  // Build the render list: group clusters first (each as a header row + indented
  // member rows), then ungrouped singles - both internally ranked by search score.
  const renderList = useMemo(() => {
    if (!active) return [];

    const matched = [];
    projects.forEach((p, idx) => {
      if (!passesAllFacets(p, selected)) return;
      const score = searching ? searchScore(p, queryWords) : 0;
      if (searching && score === 0) return;
      matched.push({ project: p, score, idx });
    });

    const groupMap = new Map(); // groupName -> items[]
    const singles = [];
    matched.forEach((item) => {
      const g = item.project.group;
      if (g) {
        if (!groupMap.has(g)) groupMap.set(g, []);
        groupMap.get(g).push(item);
      } else {
        singles.push(item);
      }
    });

    const clusters = [...groupMap.entries()].map(([groupName, items]) => {
      items.sort((a, b) => a.project.name.localeCompare(b.project.name));
      const bestScore = Math.max(...items.map((i) => i.score));
      const firstIdx = Math.min(...items.map((i) => i.idx));
      return { groupName, items, bestScore, firstIdx };
    });
    clusters.sort((a, b) =>
      searching ? b.bestScore - a.bestScore || a.firstIdx - b.firstIdx : a.firstIdx - b.firstIdx
    );
    singles.sort((a, b) => (searching ? b.score - a.score || a.idx - b.idx : a.idx - b.idx));

    const rows = [];
    clusters.forEach((c) => {
      rows.push({ type: "groupHeader", key: "g-" + c.groupName, groupName: c.groupName });
      c.items.forEach((item) => {
        rows.push({ type: "project", key: "p-" + item.idx, project: item.project, indented: true });
      });
    });
    singles.forEach((item) => {
      rows.push({ type: "project", key: "p-" + item.idx, project: item.project, indented: false });
    });
    return rows;
  }, [projects, selected, active, searching, queryWords]);

  const shownProjectCount = renderList.filter((r) => r.type === "project").length;

  let resultsHeading;
  if (!active) {
    resultsHeading = "Projects";
  } else if (headingItems.length === 1) {
    resultsHeading = `${shownProjectCount} project${shownProjectCount === 1 ? "" : "s"} in ${headingItems[0]}`;
  } else {
    resultsHeading = `${shownProjectCount} projects · ${headingItems.join(" · ")}`;
  }

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', Arial, sans-serif", maxWidth: 980, margin: "0 auto", padding: "24px 20px", color: "#1b1f23" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 700, margin: 0, letterSpacing: "-0.01em", color: "#312e81", lineHeight: 1.3 }}>
          100+ projects across industries, functions and business problems.
        </h1>
      </div>

      <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>Explore the experience</div>
          {(totalSelected > 0 || query) && (
            <button
              onClick={clearAll}
              style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              clear all filters
            </button>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects (e.g. supply chain optimisation)"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 14px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              outline: "none",
            }}
          />
        </div>

        {FACETS.map((f) => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {f.label}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {facetOptions[f.key].map(({ value, count }) => {
                const isOn = selected[f.key].includes(value);
                const isOther = value === "Other";
                const icon = FACET_ICONS[f.key][value];
                return (
                  <button
                    key={value}
                    onClick={() => toggle(f.key, value)}
                    onMouseEnter={(e) => {
                      if (isOther) {
                        setHover({ text: OTHER_LEGEND[f.key], rect: e.currentTarget.getBoundingClientRect() });
                      }
                    }}
                    onMouseLeave={() => {
                      if (isOther) setHover(null);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: isOn ? "1px solid #1d4ed8" : isOther ? "1px dashed #d1d5db" : "1px solid #d1d5db",
                      background: isOn ? "#1d4ed8" : "#fff",
                      color: isOn ? "#fff" : "#4b5563",
                      fontSize: 13,
                      fontWeight: isOn ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
                    {value}
                    <span style={{ marginLeft: 2, fontSize: 11, opacity: isOn ? 0.85 : 0.55 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1b1f23", marginBottom: 10 }}>{resultsHeading}</div>

        {!active && (
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Select at least one filter or type a search to see matching projects.
          </div>
        )}

        {active && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {renderList.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                No projects match this combination of filters.
              </div>
            ) : (
              renderList.map((row, i) => {
                if (row.type === "groupHeader") {
                  return (
                    <div
                      key={row.key}
                      style={{
                        padding: "10px 16px",
                        fontSize: 13.5,
                        fontWeight: 700,
                        background: "#eef2ff",
                        borderBottom: "1px solid #f0f1f3",
                        borderTop: i > 0 ? "1px solid #e5e7eb" : "none",
                        color: "#312e81",
                      }}
                    >
                      {row.groupName}
                    </div>
                  );
                }
                const p = row.project;
                return (
                  <div
                    key={row.key}
                    onMouseEnter={(e) =>
                      setHover({ text: p.description, rect: e.currentTarget.getBoundingClientRect() })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{
                      padding: `10px 16px 10px ${row.indented ? 40 : 16}px`,
                      borderBottom: i < renderList.length - 1 ? "1px solid #f0f1f3" : "none",
                      fontSize: 14,
                      lineHeight: 1.5,
                      background: row.indented ? "#fafbff" : "#fff",
                      cursor: "default",
                    }}
                  >
                    {p.name}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {hover && <Tooltip text={hover.text} anchorRect={hover.rect} />}
    </div>
  );
}

function App() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("projects.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load projects.json (HTTP " + res.status + ")");
        return res.json();
      })
      .then(setProjects)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif", color: "#b91c1c" }}>
        Could not load project data: {error}
        <br />
        If you're opening this file directly from disk, run a local server instead
        (e.g. <code>python3 -m http.server</code>) since browsers block file:// fetches.
      </div>
    );
  }

  if (!projects) {
    return <div style={{ padding: 40, fontFamily: "Arial, sans-serif", color: "#9ca3af" }}>Loading projects…</div>;
  }

  return <ProjectFilter projects={projects} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
