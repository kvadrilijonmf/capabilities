const { useState, useEffect, useMemo } = React;

const FACETS = [
  { key: "industries", label: "Industry" },
  { key: "expertise", label: "Expertise" },
  { key: "departments", label: "Department" },
  { key: "capabilities", label: "Capability" },
];

// Count occurrences of each value within a facet, given a pool of projects.
// Sorted most -> least frequent, zero-count values dropped entirely.
function rankedValues(facetKey, pool) {
  const counts = {};
  pool.forEach((p) => {
    p[facetKey].forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

// Projects matching every facet's selections EXCEPT the one named in `excludeKey`.
function projectsForOtherFacets(projects, selected, excludeKey) {
  return projects.filter((p) =>
    FACETS.every((f) => {
      if (f.key === excludeKey) return true;
      const chosen = selected[f.key];
      if (chosen.length === 0) return true;
      return p[f.key].some((v) => chosen.includes(v));
    })
  );
}

function ProjectFilter({ projects }) {
  const [selected, setSelected] = useState({
    industries: [],
    expertise: [],
    departments: [],
    capabilities: [],
  });

  const facetOptions = useMemo(() => {
    const out = {};
    FACETS.forEach((f) => {
      const pool = projectsForOtherFacets(projects, selected, f.key);
      const ranked = rankedValues(f.key, pool);
      selected[f.key].forEach((v) => {
        if (!ranked.some((r) => r.value === v)) {
          ranked.push({ value: v, count: 0 });
        }
      });
      out[f.key] = ranked;
    });
    return out;
  }, [selected, projects]);

  function toggle(facetKey, value) {
    setSelected((prev) => {
      const cur = prev[facetKey];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [facetKey]: next };
    });
  }

  function clearAll() {
    setSelected({ industries: [], expertise: [], departments: [], capabilities: [] });
  }

  const totalSelected = FACETS.reduce((n, f) => n + selected[f.key].length, 0);

  const filtered = useMemo(() => {
    if (totalSelected === 0) return [];
    return projects.filter((p) =>
      FACETS.every((f) => {
        const chosen = selected[f.key];
        if (chosen.length === 0) return true;
        return p[f.key].some((v) => chosen.includes(v));
      })
    );
  }, [selected, totalSelected, projects]);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', Arial, sans-serif", maxWidth: 980, margin: "0 auto", padding: "24px 20px", color: "#1b1f23" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Project Database</h1>
        {totalSelected > 0 && (
          <button
            onClick={clearAll}
            style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            clear all filters
          </button>
        )}
      </div>

      {FACETS.map((f) => (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            {f.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {facetOptions[f.key].map(({ value, count }) => {
              const isOn = selected[f.key].includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggle(f.key, value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: isOn ? "1px solid #1d4ed8" : "1px solid #d1d5db",
                    background: isOn ? "#1d4ed8" : "#f9fafb",
                    color: isOn ? "#fff" : "#4b5563",
                    fontSize: 13,
                    fontWeight: isOn ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                >
                  {value}
                  <span style={{ marginLeft: 5, fontSize: 11, opacity: isOn ? 0.85 : 0.55 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
          {totalSelected === 0
            ? "Select at least one filter to see matching projects."
            : `${filtered.length} of ${projects.length} projects`}
        </div>

        {totalSelected > 0 && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                No projects match this combination of filters.
              </div>
            ) : (
              filtered.map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < filtered.length - 1 ? "1px solid #f0f1f3" : "none",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {p.name}
                </div>
              ))
            )}
          </div>
        )}
      </div>
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
