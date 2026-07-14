"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CategoryCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName, description }),
    });
    setSubmitting(false);
    if (!response.ok) return;
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className="category-create-panel">
      <div className="workspace-header compact">
        <strong>Add category</strong>
      </div>
      <div className="category-create-grid">
        <label className="news-field">
          <span>Category name</span>
          <input placeholder="e.g. Contract lifecycle management" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="news-field">
          <span>Description</span>
          <textarea
            rows={2}
            placeholder="Short description shown on the dashboard"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <button className="primary" onClick={submit} disabled={submitting}>
        {submitting ? "Adding..." : "Add category"}
      </button>
    </div>
  );
}
