"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  stats: {
    categories: number;
    tools: number;
    peerFirms: number;
    sightings: number;
  };
}) {
  const router = useRouter();
  const [standFirmId, setStandFirmId] = useState("");
  const [standToolId, setStandToolId] = useState("");
  const [standCategoryId, setStandCategoryId] = useState("");
  const [standPanelOpen, setStandPanelOpen] = useState(true);
  const [peerChoice, setPeerChoice] = useState<"existing" | "new">("existing");
  const [toolChoice, setToolChoice] = useState<"existing" | "new">("existing");
  const [newPeerFirmName, setNewPeerFirmName] = useState("");
  const [newToolName, setNewToolName] = useState("");
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

  async function createPeerFirm() {
    const name = newPeerFirmName.trim();
    if (!name) return;
    const response = await fetch("/api/peer-firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) return;
    const firm = (await response.json()) as PeerFirm;
    setForm((current) => ({ ...current, peerFirmId: firm.id }));
    setPeerChoice("existing");
    setNewPeerFirmName("");
    router.refresh();
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
    setToolChoice("existing");
    setForm((current) => ({ ...current, toolId: tool.id }));
    setNewToolName("");
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

  const filteredAdoptions = useMemo(() => {
    return adoptions.filter((a) => {
      if (standFirmId && a.peerFirm.id !== standFirmId) return false;
      if (standToolId && a.tool?.id !== standToolId) return false;
      if (standCategoryId && a.category.id !== standCategoryId) return false;
      return true;
    });
  }, [adoptions, standCategoryId, standFirmId, standToolId]);

  const exportParams = useMemo(() => {
    const params = new URLSearchParams();
    if (standFirmId) params.set("firmId", standFirmId);
    if (standToolId) params.set("toolId", standToolId);
    if (standCategoryId) params.set("categoryId", standCategoryId);
    return params.toString();
  }, [standCategoryId, standFirmId, standToolId]);

  return (
    <div>
      <h2>Peer firm benchmarking</h2>
      <p className="muted">
        A sourced log of what peer firms are adopting - from legal press, conference talks, case studies, and
        vendor announcements.
      </p>

      <div className="peers-layout">
        <div className="peers-main">
          <h3 style={{ fontSize: 15, marginTop: 24 }}>Log an adoption sighting</h3>
          <div className="stack-create-panel compact-peer-form" style={{ marginBottom: 12 }}>
            <div className="stack-create-grid peer-entry-grid">
              <label className="news-field">
                <span>Firm</span>
                <select
                  value={peerChoice === "new" ? "__new__" : form.peerFirmId || "__select__"}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setPeerChoice("new");
                      return;
                    }
                    if (e.target.value === "__select__") return;
                    setPeerChoice("existing");
                    setForm({ ...form, peerFirmId: e.target.value });
                  }}
                >
                  <option value="__select__" disabled>
                    Select or add firm
                  </option>
                  <option value="__new__">+ New peer firm</option>
                  {peerFirms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                {peerChoice === "new" && (
                  <div className="form-row">
                    <input placeholder="New peer firm name" value={newPeerFirmName} onChange={(e) => setNewPeerFirmName(e.target.value)} />
                    <button type="button" className="framework-action framework-action-add" onClick={createPeerFirm} aria-label="Add peer firm">
                      +
                    </button>
                  </div>
                )}
              </label>
              <label className="news-field">
                <span>Category</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => {
                    setForm({ ...form, categoryId: e.target.value, toolId: "" });
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="news-field">
                <span>Tool</span>
                <select
                  value={toolChoice === "new" ? "__new__" : form.toolId || "__select__"}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setToolChoice("new");
                      return;
                    }
                    if (e.target.value === "__select__") return;
                    setToolChoice("existing");
                    setForm({ ...form, toolId: e.target.value });
                  }}
                >
                  <option value="__select__" disabled>
                    Select or add tool
                  </option>
                  <option value="__new__">+ New tool</option>
                  {toolsForForm.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {toolChoice === "new" && (
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
                <input type="date" value={form.dateLogged} onChange={(e) => setForm({ ...form, dateLogged: e.target.value })} />
              </label>
              <label className="news-field" style={{ gridColumn: "1 / -1" }}>
                <span>Source note</span>
                <input
                  placeholder="Source note (e.g. mentioned in Law.com article about their AI rollout)"
                  value={form.sourceNote}
                  onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
                />
              </label>
              <label className="news-field" style={{ gridColumn: "1 / span 2" }}>
                <span>Source URL</span>
                <input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
              </label>
              <button className="primary" onClick={submitAdoption} disabled={submitting}>
                {submitting ? "Adding..." : "Log sighting"}
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: 15, marginTop: 28 }}>All logged sightings</h3>
          {adoptions.map((a) => (
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
        </div>

        <aside className={standPanelOpen ? "peers-side open" : "peers-side closed"}>
          <div className="report-card">
            <div className="workspace-header">
              <strong>Where we stand</strong>
              <button
                type="button"
                aria-label={standPanelOpen ? "Collapse where we stand panel" : "Expand where we stand panel"}
                title={standPanelOpen ? "Collapse" : "Expand"}
                onClick={() => setStandPanelOpen((open) => !open)}
              >
                {standPanelOpen ? "▾" : "▴"}
              </button>
            </div>
            {standPanelOpen && (
              <>
                <div className="form-row" style={{ marginTop: 12 }}>
                  <select value={standFirmId} onChange={(e) => setStandFirmId(e.target.value)}>
                    <option value="">All firm names</option>
                    {peerFirms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <select value={standToolId} onChange={(e) => setStandToolId(e.target.value)}>
                    <option value="">All tools</option>
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select value={standCategoryId} onChange={(e) => setStandCategoryId(e.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <a className="export-button" href={`/api/peer-adoptions/export${exportParams ? `?${exportParams}` : ""}`}>
                  Export PDF
                </a>
                <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
                  Exports filtered data when any filter is selected. Otherwise it exports the full log.
                </p>
                <p className="muted" style={{ marginTop: 14, marginBottom: 0 }}>
                  Showing {filteredAdoptions.length} matching sighting{filteredAdoptions.length === 1 ? "" : "s"}.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
