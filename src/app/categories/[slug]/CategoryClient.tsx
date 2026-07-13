"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FrameworkTool = { id: string; name: string; sortOrder: number };
type FrameworkCriterion = { id: string; name: string; description: string | null; weight: number; sortOrder: number };
type FrameworkScore = { id: string; toolId: string; criterionId: string; score: number | null };
type FrameworkStackItem = { id: string; frameworkId: string; name: string; role: string | null; notes: string | null; sortOrder: number };
type FrameworkGapItem = { id: string; frameworkId: string; title: string; notes: string | null; sortOrder: number };
type Framework = {
  id: string;
  name: string;
  clientName: string | null;
  updatedAt: string | Date;
  tools: FrameworkTool[];
  criteria: FrameworkCriterion[];
  scores: FrameworkScore[];
  stackItems: FrameworkStackItem[];
  gapItems: FrameworkGapItem[];
};
type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  frameworks: Framework[];
};

type PurposeDraft = {
  purpose: string;
  toolName: string;
  notes: string;
};

type GapDraft = {
  title: string;
  notes: string;
};

export default function CategoryClient({
  category,
}: {
  category: Category;
}) {
  const router = useRouter();
  const [activeFrameworkId, setActiveFrameworkId] = useState(category.frameworks[0]?.id ?? "");
  const [purposeDraft, setPurposeDraft] = useState<PurposeDraft>({ purpose: "", toolName: "", notes: "" });
  const [gapDraft, setGapDraft] = useState<GapDraft>({ title: "", notes: "" });
  const [draggedToolId, setDraggedToolId] = useState<string | null>(null);
  const [toolOrder, setToolOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!activeFrameworkId && category.frameworks[0]?.id) {
      setActiveFrameworkId(category.frameworks[0].id);
    }
  }, [activeFrameworkId, category.frameworks]);

  const activeFramework = useMemo(
    () => category.frameworks.find((framework) => framework.id === activeFrameworkId) ?? category.frameworks[0],
    [activeFrameworkId, category.frameworks]
  );
  const orderedTools = useMemo(() => {
    if (!activeFramework) return [];
    const toolMap = new Map(activeFramework.tools.map((tool) => [tool.id, tool]));
    const ids = toolOrder.length ? toolOrder : activeFramework.tools.map((tool) => tool.id);
    const ordered = ids.map((id) => toolMap.get(id)).filter((tool): tool is FrameworkTool => Boolean(tool));
    return ordered.length === activeFramework.tools.length ? ordered : activeFramework.tools;
  }, [activeFramework, toolOrder]);

  useEffect(() => {
    setToolOrder(activeFramework?.tools.map((tool) => tool.id) ?? []);
  }, [activeFramework?.id, activeFramework?.tools]);

  async function createFramework() {
    const name = window.prompt("Framework name", `${category.name} Evaluation`);
    if (!name) return;
    const clientName = window.prompt("Client name (optional)", "");
    await fetch(`/api/categories/${category.id}/frameworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientName }),
    });
    router.refresh();
  }

  async function renameFramework(frameworkId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/frameworks/${frameworkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  async function saveFrameworkClientName(frameworkId: string, clientName: string) {
    await fetch(`/api/frameworks/${frameworkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName }),
    });
    router.refresh();
  }

  async function deleteFramework(frameworkId: string) {
    if (!window.confirm("Delete this framework?")) return;
    await fetch(`/api/frameworks/${frameworkId}`, { method: "DELETE" });
    if (activeFrameworkId === frameworkId) setActiveFrameworkId("");
    router.refresh();
  }

  async function addTool() {
    if (!activeFramework) return;
    const name = window.prompt("New vendor or tool name");
    if (!name) return;
    await fetch(`/api/frameworks/${activeFramework.id}/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function renameTool(toolId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/framework-tools/${toolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  async function saveToolOrder(nextToolIds: string[]) {
    if (!activeFramework) return;
    await fetch(`/api/frameworks/${activeFramework.id}/tools/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolIds: nextToolIds }),
    });
    router.refresh();
  }

  async function deleteTool(toolId: string) {
    if (!window.confirm("Remove this vendor/tool from the framework?")) return;
    await fetch(`/api/framework-tools/${toolId}`, { method: "DELETE" });
    router.refresh();
  }

  function moveTool(fromId: string, toId: string) {
    if (!activeFramework || fromId === toId) return;
    const next = [...orderedTools.map((tool) => tool.id)];
    const fromIndex = next.indexOf(fromId);
    const toIndex = next.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, fromId);
    setToolOrder(next);
    void saveToolOrder(next);
  }

  function onToolDragStart(toolId: string) {
    setDraggedToolId(toolId);
  }

  function onToolDrop(targetToolId: string) {
    if (!draggedToolId) return;
    moveTool(draggedToolId, targetToolId);
    setDraggedToolId(null);
  }

  async function addCriterion() {
    if (!activeFramework) return;
    const name = window.prompt("New criterion");
    if (!name) return;
    const description = window.prompt("Scoring hint or description (optional)", "");
    await fetch(`/api/frameworks/${activeFramework.id}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    router.refresh();
  }

  async function renameCriterion(criterionId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/framework-criteria/${criterionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  async function saveCriterionWeights(updatedCriterionId: string, updatedWeight: number) {
    if (!activeFramework) return;
    const criteria = [...activeFramework.criteria].sort((a, b) => a.sortOrder - b.sortOrder);
    if (criteria.length === 0) return;
    const safeWeight = Number.isFinite(updatedWeight) ? Math.max(0, Math.min(1, updatedWeight)) : 0;
    const remaining = 1 - safeWeight;
    const others = criteria.filter((criterion) => criterion.id !== updatedCriterionId);
    const otherWeight = others.length > 0 ? remaining / others.length : 1;
    const weights = criteria.map((criterion) => ({
      id: criterion.id,
      weight: criterion.id === updatedCriterionId ? safeWeight : otherWeight,
    }));
    await fetch(`/api/frameworks/${activeFramework.id}/criteria/weights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    });
    router.refresh();
  }

  async function deleteCriterion(criterionId: string) {
    if (!window.confirm("Remove this criterion from the framework?")) return;
    await fetch(`/api/framework-criteria/${criterionId}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveScore(toolId: string, criterionId: string, score: string) {
    if (!activeFramework) return;
    const parsed = score === "" ? null : Math.max(1, Math.min(5, parseInt(score, 10)));
    await fetch("/api/framework-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworkId: activeFramework.id, toolId, criterionId, score: parsed }),
    });
    router.refresh();
  }

  async function addStackItem() {
    if (!activeFramework) return;
    const purpose = purposeDraft.purpose.trim();
    const name = purposeDraft.toolName.trim();
    const notes = purposeDraft.notes.trim();
    if (!purpose || !name) return;
    await fetch(`/api/frameworks/${activeFramework.id}/stack-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role: purpose, notes }),
    });
    setPurposeDraft({ purpose, toolName: "", notes: "" });
    router.refresh();
  }

  async function addGapItem() {
    if (!activeFramework) return;
    const title = gapDraft.title.trim();
    const notes = gapDraft.notes.trim();
    if (!title) return;
    await fetch(`/api/frameworks/${activeFramework.id}/gap-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes }),
    });
    setGapDraft({ title, notes: "" });
    router.refresh();
  }

  async function renameGapItem(id: string, field: "title" | "notes", value: string) {
    await fetch(`/api/framework-gap-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  async function deleteGapItem(id: string) {
    if (!window.confirm("Remove this gap item?")) return;
    await fetch(`/api/framework-gap-items/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function renameStackItem(id: string, field: "name" | "role" | "notes", value: string) {
    await fetch(`/api/framework-stack-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  async function deleteStackItem(id: string) {
    if (!window.confirm("Remove this current stack item?")) return;
    await fetch(`/api/framework-stack-items/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function findScore(toolId: string, criterionId: string) {
    return activeFramework?.scores.find((score) => score.toolId === toolId && score.criterionId === criterionId)?.score ?? null;
  }

  const ranked = useMemo(() => {
    if (!activeFramework) return [];
    return activeFramework.tools
      .map((tool) => {
        let total = 0;
        for (const criterion of activeFramework.criteria) {
          const score = findScore(tool.id, criterion.id);
          if (score !== null) total += score * criterion.weight;
        }
        return { tool, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [activeFramework]);

  const currentStack = activeFramework?.stackItems ?? [];
  const gapItems = activeFramework?.gapItems ?? [];
  const displayCategoryName = category.slug === "genai" ? "GenAI" : category.name;

  return (
    <div>
      <h2>{displayCategoryName}</h2>
      <p className="muted">{category.description}</p>

      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="workspace-header">
            <strong>Frameworks</strong>
            <button className="framework-action framework-action-add" type="button" onClick={createFramework} aria-label="Add framework">
              +
            </button>
          </div>
          <div className="framework-list">
            {category.frameworks.length === 0 && <p className="muted">No frameworks yet.</p>}
            {category.frameworks.map((framework) => (
              <div
                key={framework.id}
                className={framework.id === activeFramework?.id ? "framework-item active" : "framework-item"}
                onClick={() => setActiveFrameworkId(framework.id)}
                role="button"
                tabIndex={0}
              >
                <input
                  className="framework-item-name"
                  defaultValue={framework.name}
                  onBlur={(e) => renameFramework(framework.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  className="framework-item-delete framework-action framework-action-delete"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFramework(framework.id);
                  }}
                  aria-label="Delete framework"
                >
                  -
                </span>
              </div>
            ))}
          </div>
        </aside>

        <section className="workspace-main">
          {!activeFramework ? (
            <div className="report-card">
              <h4>No framework selected</h4>
              <p className="muted">Create or select a framework to begin editing.</p>
            </div>
          ) : (
            <>
              <div className="workspace-toolbar">
                <div>
                  <h3 style={{ margin: 0 }}>{activeFramework.name}</h3>
                </div>
                <a className="export-button" href={`/api/frameworks/${activeFramework.id}/export`}>
                  Export PDF
                </a>
              </div>
              <div className="workspace-meta workspace-meta-inline">
                <div className="workspace-meta-item">
                  <span className="workspace-meta-label">Date</span>
                  <strong>{new Date(activeFramework.updatedAt).toLocaleDateString()}</strong>
                </div>
                <label className="workspace-meta-field workspace-meta-item">
                  Client name
                  <input
                    defaultValue={activeFramework.clientName ?? ""}
                    placeholder="e.g. ABC Bank"
                    onBlur={(e) => saveFrameworkClientName(activeFramework.id, e.target.value)}
                  />
                </label>
              </div>
              <div className="report-card">
                <div className="report-card-head">
                  <div>
                    <h4 style={{ marginBottom: 4 }}>Section 1. Client's current stack</h4>
                  </div>
                </div>
                <div className="intake-layout">
                <div className="stack-create-panel">
                  <div className="stack-create-panel-head">
                    <strong>Add item</strong>
                  </div>
                    <div className="stack-create-grid">
                      <label className="workspace-meta-field">
                        Purpose
                        <input
                          list="stack-purpose-list"
                          placeholder="e.g. Intake"
                          value={purposeDraft.purpose}
                          onChange={(e) => setPurposeDraft((current) => ({ ...current, purpose: e.target.value }))}
                        />
                      </label>
                      <label className="workspace-meta-field">
                        Tool / stack item
                        <input
                          placeholder="e.g. Outlook"
                          value={purposeDraft.toolName}
                          onChange={(e) => setPurposeDraft((current) => ({ ...current, toolName: e.target.value }))}
                        />
                      </label>
                      <label className="workspace-meta-field stack-notes-field">
                        Notes
                        <input
                          placeholder="What does it do for this purpose?"
                          value={purposeDraft.notes}
                          onChange={(e) => setPurposeDraft((current) => ({ ...current, notes: e.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="stack-create-footer">
                      <button
                        type="button"
                        className="framework-action framework-action-add framework-action-add-inline"
                        onClick={addStackItem}
                        aria-label="Add stack item"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="stack-list-panel">
                    <div className="stack-list-panel-head">
                      <strong>Current stack</strong>
                      <span className="muted">
                        {currentStack.length} item{currentStack.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="stack-grid">
                      <div className="stack-grid-head">
                        <span>Purpose</span>
                        <span>Tool</span>
                        <span>Notes</span>
                      </div>
                      {currentStack.length === 0 && (
                        <div className="muted stack-grid-empty">No current stack items added yet.</div>
                      )}
                      {currentStack.map((item) => (
                        <div key={item.id} className="stack-grid-row">
                          <input className="stack-grid-cell stack-grid-purpose" defaultValue={item.role ?? "General"} readOnly />
                          <input className="stack-grid-cell stack-grid-tool" defaultValue={item.name} readOnly />
                          <div className="stack-grid-notes-cell">
                            <input
                              className="stack-grid-cell stack-grid-notes"
                              defaultValue={item.notes ?? ""}
                              placeholder="Add notes"
                              onBlur={(e) => renameStackItem(item.id, "notes", e.target.value)}
                            />
                            <button
                              type="button"
                              className="framework-action framework-action-delete stack-grid-remove-inline"
                              onClick={() => deleteStackItem(item.id)}
                              aria-label="Remove current stack item"
                            >
                              -
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="report-card">
                <h4>Section 2: Gap to Target</h4>
                <div className="gap-create-panel">
                  <div className="stack-create-panel-head">
                    <strong>Add gap item</strong>
                  </div>
                  <div className="stack-create-grid gap-create-grid">
                    <label className="workspace-meta-field">
                      Gap item
                      <input
                        placeholder="e.g. Need a triage step for intake"
                        value={gapDraft.title}
                        onChange={(e) => setGapDraft((current) => ({ ...current, title: e.target.value }))}
                      />
                    </label>
                    <label className="workspace-meta-field stack-notes-field">
                      Notes
                      <input
                        placeholder="What did the client say?"
                        value={gapDraft.notes}
                        onChange={(e) => setGapDraft((current) => ({ ...current, notes: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="stack-create-footer">
                    <button
                      type="button"
                      className="framework-action framework-action-add framework-action-add-inline"
                      onClick={addGapItem}
                      aria-label="Add gap item"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="gap-list-panel">
                  <div className="stack-list-panel-head">
                    <strong>Gap items</strong>
                    <span className="muted">
                      {gapItems.length} item{gapItems.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="gap-grid">
                    <div className="gap-grid-head">
                      <span>Gap item</span>
                      <span>Notes</span>
                      <span aria-hidden="true" />
                    </div>
                    {gapItems.length === 0 && <div className="muted stack-grid-empty">No gap items added yet.</div>}
                    {gapItems.map((item) => (
                      <div key={item.id} className="gap-grid-row">
                        <input
                          className="gap-grid-title"
                          defaultValue={item.title}
                          onBlur={(e) => renameGapItem(item.id, "title", e.target.value)}
                          placeholder="Gap item"
                        />
                        <input
                          className="gap-grid-notes"
                          defaultValue={item.notes ?? ""}
                          onBlur={(e) => renameGapItem(item.id, "notes", e.target.value)}
                          placeholder="Notes"
                        />
                        <button
                          type="button"
                          className="framework-action framework-action-delete gap-grid-remove"
                          onClick={() => deleteGapItem(item.id)}
                          aria-label="Remove gap item"
                        >
                          -
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="report-card matrix-card">
                <div className="workspace-header">
                  <div>
                    <h4 style={{ marginBottom: 4 }}>Section 3: Scoring Matrix</h4>
                  </div>
                  <div className="matrix-toolbar">
                    <button type="button" className="matrix-action-button" onClick={addTool}>
                      + Vendor
                    </button>
                    <button type="button" className="matrix-action-button" onClick={addCriterion}>
                      + Criterion
                    </button>
                  </div>
                </div>
                <div className="score-rubric">
                  <strong>Score rubric</strong>
                  <div className="score-rubric-grid">
                    <div><span>1</span><p>Not present / no meaningful fit</p></div>
                    <div><span>2</span><p>Weak fit with major gaps</p></div>
                    <div><span>3</span><p>Acceptable fit with some gaps</p></div>
                    <div><span>4</span><p>Strong fit with minor gaps</p></div>
                    <div><span>5</span><p>Excellent fit / fully meets the need</p></div>
                  </div>
                </div>
                <div className="workspace-table-wrap">
                  <table>
                  <thead>
                    <tr>
                      <th>Criterion</th>
                      <th>Weight</th>
                      {orderedTools.map((tool) => (
                        <th
                          key={tool.id}
                          className={draggedToolId === tool.id ? "tool-drop-target active" : "tool-drop-target"}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onToolDrop(tool.id)}
                        >
                          <div className="matrix-header">
                            <button
                              type="button"
                              className="tool-drag-handle"
                              draggable
                              onDragStart={() => onToolDragStart(tool.id)}
                              onDragEnd={() => setDraggedToolId(null)}
                              aria-label={`Move ${tool.name}`}
                              title="Drag to reorder"
                            >
                              ⋮⋮
                            </button>
                            <input
                              className="matrix-inline-input"
                              defaultValue={tool.name}
                              onBlur={(e) => renameTool(tool.id, e.target.value)}
                            />
                            <button type="button" className="framework-action framework-action-delete" onClick={() => deleteTool(tool.id)}>
                              -
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeFramework.criteria.map((criterion) => (
                      <tr key={criterion.id}>
                        <td>
                          <div className="criterion-cell">
                            <div className="matrix-row-label">
                              <input
                                className="matrix-inline-input"
                                defaultValue={criterion.name}
                                onBlur={(e) => renameCriterion(criterion.id, e.target.value)}
                              />
                              <button
                                type="button"
                                className="framework-action framework-action-delete"
                                onClick={() => deleteCriterion(criterion.id)}
                              >
                                -
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            className="score-input"
                            type="number"
                            step="0.01"
                            min={0}
                            max={1}
                            defaultValue={criterion.weight}
                            onBlur={(e) => saveCriterionWeights(criterion.id, Number(e.target.value))}
                          />
                        </td>
                        {orderedTools.map((tool) => (
                          <td key={tool.id}>
                            <input
                              className="score-input"
                              type="number"
                              min={1}
                              max={5}
                              defaultValue={findScore(tool.id, criterion.id) ?? ""}
                              onBlur={(e) => saveScore(tool.id, criterion.id, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <strong>Ranking</strong>
                      </td>
                      <td />
                      {orderedTools.map((tool) => (
                        <td key={tool.id}>
                          <strong>{ranked.find((row) => row.tool.id === tool.id)?.total.toFixed(2) ?? "0.00"}</strong>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                  </table>
                </div>
              </div>

              <div className="report-card">
                <h4>Recommendation summary</h4>
                <p className="muted" style={{ marginTop: 0 }}>
                  Top ranked vendor: <strong>{ranked[0]?.tool.name ?? "N/A"}</strong>
                </p>
                <p className="muted" style={{ marginBottom: 0 }}>
                  Suggested next step: review the consultant-authored gap items before adjusting the matrix.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
