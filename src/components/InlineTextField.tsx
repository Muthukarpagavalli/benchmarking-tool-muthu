"use client";

import { useEffect, useRef, useState } from "react";

type InlineTextFieldProps = {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
};

export default function InlineTextField({
  value,
  onSave,
  placeholder = "Click to edit",
  ariaLabel,
  className,
  disabled = false,
}: InlineTextFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  async function commit() {
    const next = draft.trim();
    const current = value.trim();
    if (disabled) return;
    if (next === current) {
      setIsEditing(false);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setIsEditing(false);
    } catch (err) {
      setError("Unable to save. Please try again.");
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => !disabled && setIsEditing(true)}
        aria-label={ariaLabel}
        disabled={disabled}
        style={{ textAlign: "left", width: "100%" }}
      >
        {value.trim() || placeholder}
        {error ? <span style={{ marginLeft: 8, color: "#8a2b2b", fontSize: 11 }}>{error}</span> : null}
      </button>
    );
  }

  return (
    <div className={className} style={{ display: "grid", gap: 6 }}>
      <input
        ref={inputRef}
        value={draft}
        aria-label={ariaLabel}
        placeholder={placeholder}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setIsEditing(false);
            setError(null);
          }
        }}
      />
      {saving ? <span style={{ fontSize: 11, color: "#5a6a58" }}>Saving...</span> : null}
      {error ? <span style={{ fontSize: 11, color: "#8a2b2b" }}>{error}</span> : null}
    </div>
  );
}
