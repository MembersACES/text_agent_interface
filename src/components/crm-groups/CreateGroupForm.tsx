"use client";

import { useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";
import { slugifyDisplayName, type EntityGroupListItem } from "@/lib/entity-groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CreateGroupFormProps {
  token: string;
  onCreated?: (group: EntityGroupListItem) => void;
  onCancel?: () => void;
  submitLabel?: string;
  initialDisplayName?: string;
  initialSlug?: string;
  className?: string;
}

export function CreateGroupForm({
  token,
  onCreated,
  onCancel,
  submitLabel = "Create group",
  initialDisplayName = "",
  initialSlug = "",
  className,
}: CreateGroupFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [slug, setSlug] = useState(initialSlug);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSlug = useMemo(() => slugifyDisplayName(displayName), [displayName]);

  const handleSubmit = async () => {
    const trimmedName = displayName.trim();
    const trimmedSlug = (slug.trim() || autoSlug).trim();
    if (!trimmedName || !trimmedSlug) {
      setError("Display name and slug are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: trimmedSlug, display_name: trimmedName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to create group");
      }
      const created = (await res.json()) as EntityGroupListItem;
      setDisplayName("");
      setSlug("");
      onCreated?.(created);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className ?? "space-y-3"}>
      <Input
        label="Group display name"
        value={displayName}
        onChange={(e) => {
          setDisplayName(e.target.value);
          if (!slug.trim()) {
            setSlug(slugifyDisplayName(e.target.value));
          }
        }}
        placeholder="e.g. Bentleigh RSL Group"
      />
      <Input
        label="Slug"
        value={slug || autoSlug}
        onChange={(e) => setSlug(e.target.value)}
        className="font-mono"
        placeholder="bentleigh-rsl-group"
        hint="Lowercase kebab-case; used in API filters"
      />
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          loading={submitting}
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
