"use client";

import { useState } from "react";

export default function CategoryDescriptionEditor({
  categoryId,
  initialDescription,
}: {
  categoryId: string;
  initialDescription: string | null;
}) {
  const [description, setDescription] = useState(initialDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    setSaving(false);
    if (response.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div className="category-description-editor">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a short description for this category"
        rows={3}
      />
      <div className="category-description-actions">
        <button type="button" className="matrix-delete" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save description"}
        </button>
        {saved ? <span className="category-description-saved">Saved</span> : null}
      </div>
    </div>
  );
}
