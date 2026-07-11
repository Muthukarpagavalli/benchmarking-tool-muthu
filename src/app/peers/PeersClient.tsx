"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";

type Category = { id: string; slug: string; name: string };
type Tool = { id: string; name: string; categoryId: string; ourFirmStatus: string };
type PeerFirm = { id: string; name: string };
type Adoption = {
  id: string;
  dateLogged: string;
  sourceNote: string;
  sourceUrl: string | null;
  peerFirm: PeerFirm;
  category: Category;
  tool: Tool | null;
};

export default function PeersClient({
  peerFirms,
  categories,
  tools,
  adoptions,
  stats,
}: {
  peerFirms: PeerFirm[];
  categories: Category[];
  tools: Tool[];
  adoptions: Adoption[];
  stats: { categories: number; tools: number; peerFirms: number; sightings: number };
}) {
  const router = useRouter();
  const [newFirmName, setNewFirmName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [summaryCategory, setSummaryCategory] = useState(categories[0]?.id ?? "");
  const [reportFirmId, setReportFirmId] = useState(peerFirms[0]?.id ?? "");
  const [reportToolId, setReportToolId] = useState(tools[0]?.id ?? "");
  const [reportVendor, setReportVendor] = useState("");
  const [reportIndustry, setReportIndustry] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [form, setForm] = useState({
    peerFirmId: peerFirms[0]?.id ?? "",
    categoryId: categories[0]?.id ?? "",
    toolId: "",
    dateLogged: new Date().toISOString().slice(0, 10),
    sourceNote: "",
    sourceUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const toolsForForm = tools.filter((t) => t.categoryId === form.categoryId);
  const reportCategories = categories;

  async function addFirm() {
    if (!newFirmName.trim()) return;
    await fetch("/api/peer-firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFirmName }),
    });
    setNewFirmName("");
    router.refresh();
  }

  async function createCategory() {
    const name = newCategoryName.trim() || window.prompt("New category name");
    if (!name) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setNewCategoryName("");
    router.refresh();
  }

  async function renameCategory(categoryId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  async function submitAdoption() {
    if (!form.peerFirmId || !form.sourceNote) return;
    setSubmitting(true);
    await fetch("/api/peer-adoptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    setForm((f) => ({ ...f, sourceNote: "", sourceUrl: "" }));
    router.refresh();
  }

  const summaryAdoptions = adoptions.filter((a) => a.category.id === summaryCategory);
  const frequency: Record<string, number> = {};
  for (const a of summaryAdoptions) {
    const key = a.tool?.name ?? "(unspecified tool)";
    frequency[key] = (frequency[key] ?? 0) + 1;
  }
  const ranked = Object.entries(frequency).sort((a, b) => b[1] - a[1]);

  const filteredReport = useMemo(() => {
    return adoptions.filter((a) => {
      if (reportFirmId && a.peerFirm.id !== reportFirmId) return false;
      if (reportToolId && a.tool?.id !== reportToolId) return false;
      if (reportVendor && a.tool?.name !== reportVendor) return false;
      if (reportIndustry && a.category.name !== reportIndustry) return false;
      const logged = new Date(a.dateLogged).toISOString().slice(0, 10);
      if (reportDateFrom && logged < reportDateFrom) return false;
      if (reportDateTo && logged > reportDateTo) return false;
      return true;
    });
  }, [adoptions, reportDateFrom, reportDateTo, reportFirmId, reportIndustry, reportToolId, reportVendor]);

  const filteredReportTitle = useMemo(() => {
    const categoryName = categories.find((c) => c.id === summaryCategory)?.name ?? "Benchmarking";
    return `Where We Stand - ${categoryName}`;
  }, [categories, summaryCategory]);

  const exportParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("scope", "filtered");
    if (reportFirmId) params.set("firmId", reportFirmId);
    if (reportToolId) params.set("toolId", reportToolId);
    if (reportVendor) params.set("vendor", reportVendor);
    if (reportIndustry) params.set("industry", reportIndustry);
    if (reportDateFrom) params.set("dateFrom", reportDateFrom);
    if (reportDateTo) params.set("dateTo", reportDateTo);
    return params.toString();
  }, [reportDateFrom, reportDateTo, reportFirmId, reportIndustry, reportToolId, reportVendor]);

  async function addReportCategoryToForm(categoryName: string) {
    const category = categories.find((c) => c.name === categoryName);
    if (!category) return;
    setForm((current) => ({ ...current, categoryId: category.id, toolId: "" }));
  }

  return (
    <div>
      <TopBar title="Peer benchmarking" stats={stats} />
      <h2>Peer firm benchmarking</h2>
      <p className="muted">
        A sourced log of what peer firms are adopting - from legal press, conference talks, case studies, and
        vendor announcements. Reports now update interactively as filters change.
      </p>

      <h3 style={{ fontSize: 15, marginTop: 20 }}>Peer firms</h3>
      <div className="form-row">
        <input placeholder="Add a peer firm name" value={newFirmName} onChange={(e) => setNewFirmName(e.target.value)} />
        <button onClick={addFirm}>Add firm</button>
      </div>
      <p className="muted">{peerFirms.map((f) => f.name).join(", ") || "No peer firms logged yet."}</p>

      <h3 style={{ fontSize: 15, marginTop: 24 }}>Categories</h3>
      <div className="form-row">
        <input placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
        <button onClick={createCategory}>+ New Category</button>
      </div>
      <div className="report-card">
        {reportCategories.map((category) => (
          <div key={category.id} className="form-row" style={{ alignItems: "center" }}>
            <input
              defaultValue={category.name}
              onBlur={(e) => renameCategory(category.id, e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <button type="button" onClick={() => addReportCategoryToForm(category.name)}>
              Use in form
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 15, marginTop: 24 }}>Log an adoption sighting</h3>
      <div className="form-row">
        <select value={form.peerFirmId} onChange={(e) => setForm({ ...form, peerFirmId: e.target.value })}>
          {peerFirms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={form.categoryId}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              void createCategory();
              return;
            }
            setForm({ ...form, categoryId: e.target.value, toolId: "" });
          }}
        >
          <option value="__new__">+ New Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={form.toolId} onChange={(e) => setForm({ ...form, toolId: e.target.value })}>
          <option value="">(unspecified tool)</option>
          {toolsForForm.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input type="date" value={form.dateLogged} onChange={(e) => setForm({ ...form, dateLogged: e.target.value })} />
      </div>
      <div className="form-row">
        <input
          placeholder="Source note (e.g. mentioned in Law.com article about their AI rollout)"
          value={form.sourceNote}
          onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
          style={{ flex: 3 }}
        />
        <input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
        <button className="primary" onClick={submitAdoption} disabled={submitting}>
          {submitting ? "Adding..." : "Log sighting"}
        </button>
      </div>

      <h3 style={{ fontSize: 15, marginTop: 28 }}>{filteredReportTitle}</h3>
      <div className="report-card">
        <div className="workspace-header">
          <strong>Interactive benchmarking view</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="export-button" href={`/api/peer-adoptions/export?scope=filtered&${exportParams}`}>
              Export filtered PDF
            </a>
            <a className="export-button" href="/api/peer-adoptions/export?scope=all">
              Export full PDF
            </a>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <select value={reportFirmId} onChange={(e) => setReportFirmId(e.target.value)}>
            <option value="">All firms</option>
            {peerFirms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select value={reportToolId} onChange={(e) => setReportToolId(e.target.value)}>
            <option value="">All tools</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select value={reportVendor} onChange={(e) => setReportVendor(e.target.value)}>
            <option value="">All vendors</option>
            {[...new Set(tools.map((t) => t.name))].sort((a, b) => a.localeCompare(b)).map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
          <select value={reportIndustry} onChange={(e) => setReportIndustry(e.target.value)}>
            <option value="">All industries/categories</option>
            {[...new Set(categories.map((c) => c.name))].sort((a, b) => a.localeCompare(b)).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} />
          <input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} />
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Showing {filteredReport.length} matching sighting{filteredReport.length === 1 ? "" : "s"}.
        </p>
      </div>

      <h3 style={{ fontSize: 15, marginTop: 28 }}>Where We Stand</h3>
      <div className="form-row" style={{ maxWidth: 300 }}>
        <select value={summaryCategory} onChange={(e) => setSummaryCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c.slug} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <p className="muted">Adoption frequency among logged peer firms for this category:</p>
      {ranked.length === 0 && <p className="muted">No sightings logged for this category yet.</p>}
      {ranked.map(([toolName, count]) => (
        <div key={toolName} style={{ marginBottom: 4 }}>
          <strong>{toolName}</strong> - {count} peer firm{count === 1 ? "" : "s"} logged
        </div>
      ))}

      <h3 style={{ fontSize: 15, marginTop: 28 }}>All logged sightings</h3>
      {filteredReport.map((a) => (
        <div className="news-row" style={{ gridTemplateColumns: "90px 140px 130px 130px 1fr" }} key={a.id}>
          <span>{new Date(a.dateLogged).toLocaleDateString()}</span>
          <span>{a.peerFirm.name}</span>
          <span>{a.category.name}</span>
          <span>{a.tool?.name ?? "-"}</span>
          <span>
            {a.sourceNote}
            {a.sourceUrl && (
              <>
                {" "}
                <a href={a.sourceUrl} target="_blank" rel="noreferrer">
                  source
                </a>
              </>
            )}
          </span>
        </div>
      ))}
      {filteredReport.length === 0 && <p className="muted">No adoption sightings match the current filters.</p>}
    </div>
  );
}
