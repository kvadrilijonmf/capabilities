const { useState, useEffect, useMemo } = React;

const FACETS = [
  { key: "industries", label: "Industry" },
  { key: "projectTypes", label: "Project Type" },
  { key: "departments", label: "Department" },
  { key: "expertise", label: "Expertise" },
];

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

// Does a project pass every facet's selection except the one named in excludeKey?
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

// Search: split into words, score = number of distinct query words found
// (case-insensitive substring match) in the project's search text.
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
  const [hovered, setHovered] = useState(null); // { index, rect }

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

  // Pool used for computing each facet's live counts: everything passing
  // the OTHER facets AND the current search query (but not this facet itself).
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

  // Build the display list: filter by facets + search, rank by search score,
  // then cluster group members together consecutively.
  const displayList = useMemo(() => {
    if (!active) return [];

    const matched = [];
    projects.forEach((p, idx) => {
      if (!passesAllFacets(p, selected)) return;
      const score = searching ? searchScore(p, queryWords) : 0;
      if (searching && score === 0) return;
      matched.push({ project: p, score, idx });
    });

    const ordered = searching
      ? [...matched].sort((a, b) => b.score - a.score || a.idx - b.idx)
      : matched;

    const seenGroups = new Set();
    const result = [];
    ordered.forEach((item) => {
      const g = item.project.group;
      if (g) {
        if (seenGroups.has(g)) return;
        seenGroups.add(g);
        const groupItems = matched
          .filter((m) => m.project.group === g)
          .sort((a, b) => a.idx - b.idx);
        result.push(...groupItems);
      } else {
        result.push(item);
      }
    });
    return result;
  }, [projects, selected, active, searching, queryWords]);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', Arial, sans-serif", maxWidth: 980, margin: "0 auto", padding: "24px 20px", color: "#1b1f23" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Project Database</h1>
        {(totalSelected > 0 || query) && (
          <button
            onClick={clearAll}
            style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            clear all filters
          </button>
        )}
      </div>

      {/* Search box */}
      <div style={{ marginBottom: 18 }}>
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
          {!active
            ? "Select at least one filter or type a search to see matching projects."
            : `${displayList.length} of ${projects.length} projects`}
        </div>

        {active && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {displayList.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                No projects match this combination of filters.
              </div>
            ) : (
              displayList.map((item, i) => {
                const p = item.project;
                const isGrouped = !!p.group;
                const prevGroup = i > 0 ? displayList[i - 1].project.group : null;
                const nextGroup = i < displayList.length - 1 ? displayList[i + 1].project.group : null;
                const isFirstOfGroup = isGrouped && p.group !== prevGroup;
                const isLastOfGroup = isGrouped && p.group !== nextGroup;
                return (
                  <div
                    key={i}
                    onMouseEnter={(e) =>
                      setHovered({ index: i, rect: e.currentTarget.getBoundingClientRect() })
                    }
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: i < displayList.length - 1 ? "1px solid #f0f1f3" : "none",
                      fontSize: 14,
                      lineHeight: 1.5,
                      background: isGrouped ? "#f8fafc" : "#fff",
                      borderLeft: isGrouped ? "3px solid #93c5fd" : "3px solid transparent",
                      marginTop: isFirstOfGroup ? 2 : 0,
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

      {hovered && (
        <Tooltip text={displayList[hovered.index].project.description} anchorRect={hovered.rect} />
      )}
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
