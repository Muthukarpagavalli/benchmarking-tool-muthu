"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; slug: string; name: string };
type Tool = { id: string; name: string; categoryId: string };
type NewsEntry = {
  id: string;
  date: string;
  updateType: string;
  summary: string;
  sourceUrl: string | null;
  impact: string;
  loggedBy: string;
  category: Category | null;
  categoryName: string | null;
  tool: Tool | null;
};

export default function NewsClient({
  entries,
  categories,
  tools,
  featureTypes,
  stats,
}: {
  entries: NewsEntry[];
  categories: Category[];
  tools: Tool[];
  featureTypes: string[];
  stats: {
    categories: number;
    tools: number;
    peerFirms: number;
    sightings: number;
  };
}) {
  const router = useRouter();
  type EditDraft = {
    categoryChoice: "existing" | "new";
    categoryId: string;
    categoryName: string;
    toolId: string;
    date: string;
    updateType: string;
    summary: string;
    sourceUrl: string;
    impact: string;
    loggedBy: string;
  };
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterToolId, setFilterToolId] = useState("");
  const [filterFeatureType, setFilterFeatureType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [featureTypeOptions, setFeatureTypeOptions] = useState(featureTypes);
  const [toolChoice, setToolChoice] = useState<"existing" | "new">("existing");
  const [typeChoice, setTypeChoice] = useState<"existing" | "new">("existing");
  const [categoryChoice, setCategoryChoice] = useState<"existing" | "new">("existing");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newToolName, setNewToolName] = useState("");
  const [newFeatureTypeName, setNewFeatureTypeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? "",
    toolId: "",
    date: new Date().toISOString().slice(0, 10),
    updateType: featureTypes[0] ?? "",
    summary: "",
    sourceUrl: "",
    impact: "Watch",
    loggedBy: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filterCategoryId && entry.category?.id !== filterCategoryId) return false;
      if (filterToolId && entry.tool?.id !== filterToolId) return false;
      if (filterFeatureType && entry.updateType !== filterFeatureType) return false;
      const entryDate = new Date(entry.date).toISOString().slice(0, 10);
      if (filterDateFrom && entryDate < filterDateFrom) return false;
      if (filterDateTo && entryDate > filterDateTo) return false;
      return true;
    });
  }, [entries, filterCategoryId, filterDateFrom, filterDateTo, filterFeatureType, filterToolId]);

  const toolsForCategory = categoryChoice === "existing" && form.categoryId ? tools.filter((t) => t.categoryId === form.categoryId) : tools;
  const filteredTools = tools.filter((t) => !filterCategoryId || t.categoryId === filterCategoryId);

  function beginEdit(entry: NewsEntry) {
    setEditingId(entry.id);
    setEditDraft({
      categoryChoice: entry.category ? "existing" : "new",
      categoryId: entry.category?.id ?? "",
      categoryName: entry.categoryName ?? "",
      toolId: entry.tool?.id ?? "",
      date: entry.date.slice(0, 10),
      updateType: entry.updateType,
      summary: entry.summary,
      sourceUrl: entry.sourceUrl ?? "",
      impact: entry.impact,
      loggedBy: entry.loggedBy,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    const payload = {
      ...editDraft,
      categoryId: editDraft.categoryChoice === "existing" ? editDraft.categoryId : "",
      categoryName: editDraft.categoryChoice === "new" ? editDraft.categoryName.trim() : "",
    };
    if ((!payload.categoryId && !payload.categoryName) || !payload.date || !payload.updateType || !payload.summary || !payload.loggedBy) return;
    const response = await fetch(`/api/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return;
    cancelEdit();
    router.refresh();
  }

  async function submit() {
    const categoryName = newCategoryName.trim();
    if (!form.summary || !form.loggedBy) return;
    if (categoryChoice === "new" && !categoryName) return;
    setSubmitting(true);
    await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        categoryId: categoryChoice === "existing" ? form.categoryId : "",
        categoryName: categoryChoice === "new" ? categoryName : "",
      }),
    });
    setSubmitting(false);
    setForm((f) => ({ ...f, summary: "", sourceUrl: "" }));
    setNewCategoryName("");
    setCategoryChoice("existing");
    router.refresh();
  }

  async function createFeatureType() {
    const trimmed = newFeatureTypeName.trim();
    if (!trimmed) return;
    setFeatureTypeOptions((current) => (current.includes(trimmed) ? current : [...current, trimmed].sort((a, b) => a.localeCompare(b))));
    setForm((current) => ({ ...current, updateType: trimmed }));
    setTypeChoice("existing");
    setNewFeatureTypeName("");
  }

  async function createTool() {
    const name = newToolName.trim();
    if (!name) return;
    const response = await fetch(`/api/categories/${form.categoryId}/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) return;
    const tool = (await response.json()) as Tool;
    setForm((current) => ({ ...current, toolId: tool.id }));
    setToolChoice("existing");
    setNewToolName("");
    router.refresh();
  }

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filterCategoryId) params.set("categoryId", filterCategoryId);
    if (filterToolId) params.set("toolId", filterToolId);
    if (filterFeatureType) params.set("featureType", filterFeatureType);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    return params.toString();
  }, [filterCategoryId, filterDateFrom, filterDateTo, filterFeatureType, filterToolId]);

  return (
    <div>
      <h2>News &amp; updates log</h2>
      <p className="muted">
        A running log of anything read or heard about these tools - funding news, launches, pricing changes,
        reviews. Add a row any time.
      </p>

      <div className="news-layout">
        <div className="news-main">
          <div className="report-card" style={{ marginTop: 16 }}>
            <div className="workspace-header">
              <strong>Filters</strong>
              <a className="export-button" href={`/api/news/export${exportQuery ? `?${exportQuery}` : ""}`}>
                Export PDF
              </a>
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={filterToolId} onChange={(e) => setFilterToolId(e.target.value)}>
                <option value="">All tools</option>
                {filteredTools.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select value={filterFeatureType} onChange={(e) => setFilterFeatureType(e.target.value)}>
                <option value="">All feature types</option>
                {[...new Set([...featureTypeOptions, ...filtered.map((entry) => entry.updateType)])]
                  .sort((a, b) => a.localeCompare(b))
                  .map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
              </select>
              <div className="date-range-group">
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                <span>to</span>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="news-row news-header" style={{ fontWeight: 600, borderBottom: "2px solid #ccc", marginTop: 16 }}>
            <span>Date</span>
            <span>Category</span>
            <span>Tool</span>
            <span>Type</span>
            <span>Summary</span>
            <span>Impact</span>
            <span>Action</span>
          </div>
          {filtered.map((e) => (
            <div
              className={`news-row ${editingId === e.id ? "news-row-editing" : "news-row-clickable"}`}
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (editingId !== e.id) beginEdit(e);
              }}
              onKeyDown={(ev) => {
                if ((ev.key === "Enter" || ev.key === " ") && editingId !== e.id) {
                  ev.preventDefault();
                  beginEdit(e);
                }
              }}
            >
              {editingId === e.id && editDraft ? (
                <>
                  <span>
                    <input
                      type="date"
                      value={editDraft.date}
                      onChange={(ev) => setEditDraft({ ...editDraft, date: ev.target.value })}
                    />
                  </span>
                  <span>
                    <select
                      value={editDraft.categoryChoice === "new" ? "__new__" : editDraft.categoryId || "__select__"}
                      onChange={(ev) => {
                        if (ev.target.value === "__new__") {
                          setEditDraft({ ...editDraft, categoryChoice: "new", categoryId: "", toolId: "" });
                          return;
                        }
                        setEditDraft({ ...editDraft, categoryChoice: "existing", categoryId: ev.target.value, categoryName: "", toolId: "" });
                      }}
                    >
                      <option value="__select__" disabled hidden>
                        Select category
                      </option>
                      <option value="__new__">+ New category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {editDraft.categoryChoice === "new" && (
                      <input
                        style={{ marginTop: 6 }}
                        placeholder="New category name"
                        value={editDraft.categoryName}
                        onChange={(ev) => setEditDraft({ ...editDraft, categoryName: ev.target.value })}
                      />
                    )}
                  </span>
                  <span>
                    <select
                      value={editDraft.toolId || "__select__"}
                      onChange={(ev) => setEditDraft({ ...editDraft, toolId: ev.target.value })}
                    >
                      <option value="__select__" disabled hidden>
                        Select tool
                      </option>
                      <option value="">No tool</option>
                      {tools.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>
                    <input
                      value={editDraft.updateType}
                      onChange={(ev) => setEditDraft({ ...editDraft, updateType: ev.target.value })}
                    />
                  </span>
                  <span>
                    <input
                      value={editDraft.summary}
                      onChange={(ev) => setEditDraft({ ...editDraft, summary: ev.target.value })}
                    />
                    <input
                      style={{ marginTop: 6 }}
                      value={editDraft.sourceUrl}
                      onChange={(ev) => setEditDraft({ ...editDraft, sourceUrl: ev.target.value })}
                      placeholder="Source URL"
                    />
                  </span>
                  <span>
                    <select value={editDraft.impact} onChange={(ev) => setEditDraft({ ...editDraft, impact: ev.target.value })}>
                      <option>Watch</option>
                      <option>Evaluate</option>
                      <option>Act</option>
                    </select>
                    <input
                      style={{ marginTop: 6 }}
                      value={editDraft.loggedBy}
                      onChange={(ev) => setEditDraft({ ...editDraft, loggedBy: ev.target.value })}
                      placeholder="Logged by"
                    />
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="secondary" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button type="button" className="primary" onClick={() => saveEdit(e.id)}>
                      Save
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span>{new Date(e.date).toLocaleDateString()}</span>
                  <span>{e.category?.name ?? e.categoryName ?? "-"}</span>
                  <span>{e.tool?.name ?? "-"}</span>
                  <span>{e.updateType}</span>
                  <span>
                    {e.summary}
                    {e.sourceUrl && (
                      <>
                        {" "}
                        <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                          source
                        </a>
                      </>
                    )}
                  </span>
                  <span className={`impact-${e.impact}`}>{e.impact}</span>
                  <span />
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="muted">No entries yet for this filter.</p>}
        </div>

        <aside className="news-sidebar">
          <div className="report-card news-entry-card">
            <h4>New entry</h4>
            <div className="stack-list news-entry-form">
              <label className="news-field">
                <span>Category</span>
                <select
                  value={categoryChoice === "new" ? "__new__" : form.categoryId || "__select__"}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setCategoryChoice("new");
                      setToolChoice("existing");
                      setForm({ ...form, categoryId: "", toolId: "" });
                      return;
                    }
                    setCategoryChoice("existing");
                    setNewCategoryName("");
                    setForm({ ...form, categoryId: e.target.value, toolId: "" });
                  }}
                >
                  <option value="__select__" disabled hidden>
                    Select category
                  </option>
                  <option value="__new__">+ New category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoryChoice === "new" && (
                  <div className="form-row">
                    <input
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                )}
              </label>
              <label className="news-field">
                <span>Tool</span>
                <select
                  value={toolChoice === "new" ? "__new__" : form.toolId}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setToolChoice("new");
                      return;
                    }
                    setToolChoice("existing");
                    setForm({ ...form, toolId: e.target.value });
                  }}
                >
                  {categoryChoice === "existing" && form.categoryId && <option value="__new__">+ New tool</option>}
                  <option value="" disabled hidden>
                    Select tool
                  </option>
                  {toolsForCategory.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {toolChoice === "new" && categoryChoice === "existing" && form.categoryId && (
                  <div className="form-row">
                    <input placeholder="New tool name" value={newToolName} onChange={(e) => setNewToolName(e.target.value)} />
                    <button type="button" className="framework-action framework-action-add" onClick={createTool} aria-label="Add tool">
                      +
                    </button>
                  </div>
                )}
              </label>
              <label className="news-field">
                <span>Date</span>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label className="news-field">
                <span>Type</span>
                <select
                  value={typeChoice === "new" ? "__new__" : form.updateType || "__select__"}
                  onChange={(e) => {
                    if (e.target.value === "__select__") {
                      return;
                    }
                    if (e.target.value === "__new__") {
                      setTypeChoice("new");
                      return;
                    }
                    setTypeChoice("existing");
                    setForm({ ...form, updateType: e.target.value });
                  }}
                >
                  <option value="__select__" disabled>
                    Select or add type
                  </option>
                  <option value="__new__">+ New feature type</option>
                  {[...new Set([...featureTypeOptions, ...filtered.map((entry) => entry.updateType)])]
                    .sort((a, b) => a.localeCompare(b))
                    .map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                </select>
                {typeChoice === "new" && (
                  <div className="form-row">
                    <input placeholder="New feature type" value={newFeatureTypeName} onChange={(e) => setNewFeatureTypeName(e.target.value)} />
                    <button type="button" className="framework-action framework-action-add" onClick={createFeatureType} aria-label="Add feature type">
                      +
                    </button>
                  </div>
                )}
              </label>
              <label className="news-field">
                <span>Impact</span>
                <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
                  <option>Watch</option>
                  <option>Evaluate</option>
                  <option>Act</option>
                </select>
              </label>
              <label className="news-field">
                <span>Summary</span>
                <input
                  placeholder="Summary"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </label>
              <label className="news-field">
                <span>Source URL</span>
                <input
                  placeholder="Source URL"
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                />
              </label>
              <label className="news-field">
                <span>Logged by</span>
                <input
                  placeholder="Logged by"
                  value={form.loggedBy}
                  onChange={(e) => setForm({ ...form, loggedBy: e.target.value })}
                />
              </label>
              <button className="primary" onClick={submit} disabled={submitting}>
                {submitting ? "Adding..." : "Add entry"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
