"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";

type FrameworkTool = { id: string; name: string; sortOrder: number };
type FrameworkCriterion = { id: string; name: string; description: string | null; weight: number; sortOrder: number };
type FrameworkScore = { id: string; toolId: string; criterionId: string; score: number | null };
type FrameworkStackItem = { id: string; frameworkId: string; name: string; role: string | null; notes: string | null; sortOrder: number };
type Framework = {
  id: string;
  name: string;
  clientName: string | null;
  updatedAt: string | Date;
  tools: FrameworkTool[];
  criteria: FrameworkCriterion[];
  scores: FrameworkScore[];
  stackItems: FrameworkStackItem[];
};
type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  frameworks: Framework[];
};

type StackPreset = {
  name: string;
  role: string;
  notes: string;
};

const STACK_PRESETS: Record<string, StackPreset[]> = {
  clm: [
    { name: "Outlook", role: "Intake and correspondence", notes: "Inbound request handling and follow-up." },
    { name: "Adobe Sign", role: "Signature workflow", notes: "Contract execution and approvals." },
    { name: "SharePoint", role: "Document repository", notes: "Central file storage and version control." },
    { name: "CLM platform", role: "Matter workflow", notes: "Pipeline, routing, and approvals." },
    { name: "GenAI review assistant", role: "Review support", notes: "Clause review, summaries, and redlining support." },
  ],
  dms: [
    { name: "SharePoint", role: "Document repository", notes: "Repository, permissions, and collaboration." },
    { name: "iManage", role: "Knowledge management", notes: "Controlled legal document storage." },
    { name: "Outlook", role: "Email intake", notes: "Capture and route incoming requests." },
    { name: "Adobe Sign", role: "Signature workflow", notes: "Approve and execute documents." },
  ],
  "contract-intelligence": [
    { name: "Outlook", role: "Intake and triage", notes: "Capture incoming contract requests." },
    { name: "SharePoint", role: "Document repository", notes: "Source storage and collaboration." },
    { name: "Adobe Sign", role: "Signature workflow", notes: "Execution and approvals." },
    { name: "GenAI review assistant", role: "Clause analysis", notes: "Issue spotting and playbook review." },
  ],
  genai: [
    { name: "Outlook", role: "Request intake", notes: "User demand, triage, and routing." },
    { name: "SharePoint", role: "Knowledge source", notes: "Context retrieval and file access." },
    { name: "Copilot / Chat assistant", role: "User interface", notes: "Prompting, drafting, and summarisation." },
    { name: "Governance controls", role: "Safety and audit", notes: "Guardrails, logs, and access control." },
  ],
};

function getCategoryPresets(slug: string) {
  return STACK_PRESETS[slug] ?? [
    { name: "Outlook", role: "Intake and communication", notes: "Common entry point for process work." },
    { name: "SharePoint", role: "Document repository", notes: "File storage and collaboration." },
    { name: "Adobe Sign", role: "Signature workflow", notes: "Execution and approvals." },
  ];
}

export default function CategoryClient({
  category,
  stats,
}: {
  category: Category;
  stats: { categories: number; tools: number; peerFirms: number; sightings: number };
}) {
  const router = useRouter();
  const [activeFrameworkId, setActiveFrameworkId] = useState(category.frameworks[0]?.id ?? "");

  useEffect(() => {
    if (!activeFrameworkId && category.frameworks[0]?.id) {
      setActiveFrameworkId(category.frameworks[0].id);
    }
  }, [activeFrameworkId, category.frameworks]);

  const activeFramework = useMemo(
    () => category.frameworks.find((framework) => framework.id === activeFrameworkId) ?? category.frameworks[0],
    [activeFrameworkId, category.frameworks]
  );

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
    const name = window.prompt("New vendor/tool name");
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

  async function deleteTool(toolId: string) {
    if (!window.confirm("Remove this vendor/tool from the framework?")) return;
    await fetch(`/api/framework-tools/${toolId}`, { method: "DELETE" });
    router.refresh();
  }

  async function addCriterion() {
    if (!activeFramework) return;
    const name = window.prompt("New evaluation criterion");
    if (!name) return;
    const weight = window.prompt("Weight as a decimal between 0 and 1", "0.10");
    await fetch(`/api/frameworks/${activeFramework.id}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, weight: weight ? Number(weight) : 0.1 }),
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

  async function updateWeight(criterionId: string, weight: string) {
    const parsed = Number(weight);
    if (Number.isNaN(parsed)) return;
    await fetch(`/api/framework-criteria/${criterionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: parsed }),
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
    const name = window.prompt("Client tool / stack item name", "Outlook");
    if (!name) return;
    const role = window.prompt("What role does it play?", "Email / intake");
    const notes = window.prompt("Optional notes", "");
    await fetch(`/api/frameworks/${activeFramework.id}/stack-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, notes }),
    });
    router.refresh();
  }

  async function addPresetStackItem(preset: StackPreset) {
    if (!activeFramework) return;
    await fetch(`/api/frameworks/${activeFramework.id}/stack-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    });
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

  const coverageGaps = useMemo(() => {
    if (!activeFramework) return [];
    return activeFramework.criteria
      .map((criterion) => {
        const scores = activeFramework.tools
          .map((tool) => findScore(tool.id, criterion.id))
          .filter((score): score is number => typeof score === "number");
        const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        return { criterion, average };
      })
      .filter((row) => row.average < 3)
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);
  }, [activeFramework]);

  const currentStack = activeFramework?.stackItems ?? [];
  const targetStackIdeas = useMemo(() => {
    const presetNames = new Set(currentStack.map((item) => item.name.toLowerCase()));
    return getCategoryPresets(category.slug)
      .filter((preset) => !presetNames.has(preset.name.toLowerCase()))
      .slice(0, 4);
  }, [activeFramework, category.slug]);

  return (
    <div>
      <TopBar title={category.name} stats={stats} />
      <h2>Scoring Framework Workspace</h2>
      <p className="muted">{category.description}</p>

      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="workspace-header">
            <strong>Frameworks</strong>
            <button className="primary" type="button" onClick={createFramework}>
              New framework
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
                <span className="framework-item-meta">{new Date(framework.updatedAt).toLocaleDateString()}</span>
                <span
                  className="framework-item-delete"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFramework(framework.id);
                  }}
                >
                  Delete
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
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    Edit vendors, criteria, weights, and scores directly in the matrix.
                  </p>
                </div>
                <a className="export-button" href={`/api/frameworks/${activeFramework.id}/export`}>
                  Export PDF
                </a>
              </div>
              <div className="workspace-meta">
                <label className="workspace-meta-field">
                  Client name
                  <input
                    defaultValue={activeFramework.clientName ?? ""}
                    placeholder="e.g. ABC Bank"
                    onBlur={(e) => saveFrameworkClientName(activeFramework.id, e.target.value)}
                  />
                </label>
              </div>

              <div className="workspace-actions">
                <button type="button" onClick={addTool}>
                  Add vendor
                </button>
                <button type="button" onClick={addCriterion}>
                  Add criterion
                </button>
                <button type="button" onClick={addStackItem}>
                  Add stack item
                </button>
              </div>

              <div className="report-card">
                <div className="report-card-head">
                  <h4>Current client stack</h4>
                  <div className="preset-stack-actions">
                    {getCategoryPresets(category.slug).map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        className="preset-chip"
                        onClick={() => addPresetStackItem(preset)}
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="muted" style={{ marginTop: 0 }}>
                  Capture the tools the client already uses and what each one is doing in the process.
                </p>
                <div className="stack-list">
                  {activeFramework.stackItems.length === 0 && <p className="muted">No current stack items added yet.</p>}
                  {activeFramework.stackItems.map((item) => (
                    <div key={item.id} className="stack-item">
                      <input
                        className="matrix-inline-input"
                        defaultValue={item.name}
                        onBlur={(e) => renameStackItem(item.id, "name", e.target.value)}
                      />
                      <input
                        className="matrix-inline-input"
                        defaultValue={item.role ?? ""}
                        placeholder="Role"
                        onBlur={(e) => renameStackItem(item.id, "role", e.target.value)}
                      />
                      <input
                        className="matrix-inline-input"
                        defaultValue={item.notes ?? ""}
                        placeholder="Notes"
                        onBlur={(e) => renameStackItem(item.id, "notes", e.target.value)}
                      />
                      <button type="button" className="matrix-delete" onClick={() => deleteStackItem(item.id)}>
                        Remove
                      </button>
                    </div>
                    ))}
                </div>
              </div>

              <div className="report-card">
                <h4>Gap to target stack</h4>
                <p className="muted" style={{ marginTop: 0 }}>
                  This section highlights the next tools or controls that typically close process gaps for this category.
                </p>
                <div className="gap-summary-grid">
                  <div>
                    <strong>Immediate additions</strong>
                    <ul className="gap-list">
                      {targetStackIdeas.map((preset) => (
                        <li key={preset.name}>
                          <strong>{preset.name}</strong>
                          <span>{preset.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Capability gaps</strong>
                    <ul className="gap-list">
                      {coverageGaps.length === 0 && <li>Coverage is broadly balanced across the current matrix.</li>}
                      {coverageGaps.map(({ criterion, average }) => (
                        <li key={criterion.id}>
                          <strong>{criterion.name}</strong>
                          <span>
                            Average score {average.toFixed(1)} / 5
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="workspace-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Criterion</th>
                      <th>Weight</th>
                      {activeFramework.tools.map((tool) => (
                        <th key={tool.id}>
                          <div className="matrix-header">
                            <input
                              className="matrix-inline-input"
                              defaultValue={tool.name}
                              onBlur={(e) => renameTool(tool.id, e.target.value)}
                            />
                            <button type="button" className="matrix-delete" onClick={() => deleteTool(tool.id)}>
                              Remove
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
                          <div className="matrix-row-label">
                            <input
                              className="matrix-inline-input"
                              defaultValue={criterion.name}
                              onBlur={(e) => renameCriterion(criterion.id, e.target.value)}
                            />
                            <button
                              type="button"
                              className="matrix-delete"
                              onClick={() => deleteCriterion(criterion.id)}
                            >
                              Remove
                            </button>
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
                            onBlur={(e) => updateWeight(criterion.id, e.target.value)}
                          />
                        </td>
                        {activeFramework.tools.map((tool) => (
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
                      {activeFramework.tools.map((tool) => (
                        <td key={tool.id}>
                          <strong>{ranked.find((row) => row.tool.id === tool.id)?.total.toFixed(2) ?? "0.00"}</strong>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="report-card">
                <h4>Recommendation summary</h4>
                <p className="muted" style={{ marginTop: 0 }}>
                  Top ranked vendor: <strong>{ranked[0]?.tool.name ?? "N/A"}</strong>
                </p>
                <p className="muted" style={{ marginBottom: 0 }}>
                  Suggested next step: <strong>{targetStackIdeas[0]?.name ?? "Refine current controls"}</strong>
                  {targetStackIdeas[0] ? ` for ${targetStackIdeas[0].role.toLowerCase()}.` : "."}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
