"use client";

import { Card, CardContent } from "@/components/ui/card";
import { NoteTypeBadge } from "../shared/NoteTypeBadge";
import { formatDate } from "../shared/formatDate";
import type { Note } from "../types";

const NOTE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
];

export interface NotesTabProps {
  notes: Note[];
  newNote: string;
  newNoteType: string;
  creatingNote: boolean;
  onNewNoteChange: (value: string) => void;
  onNewNoteTypeChange: (value: string) => void;
  onSubmitNote: (e: React.FormEvent) => void;
  onEditNote?: (note: Note) => void;
  onDeleteNote?: (noteId: number) => void;
}

export function NotesTab({
  notes,
  newNote,
  newNoteType,
  creatingNote,
  onNewNoteChange,
  onNewNoteTypeChange,
  onSubmitNote,
  onEditNote,
  onDeleteNote,
}: NotesTabProps) {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Notes & activity
        </h2>
        <form onSubmit={onSubmitNote} className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Type:
            </label>
            <select
              value={newNoteType}
              onChange={(e) => onNewNoteTypeChange(e.target.value)}
              className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            >
              {NOTE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={newNote}
            onChange={(e) => onNewNoteChange(e.target.value)}
            rows={3}
            placeholder="Add a note about this member..."
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creatingNote || !newNote.trim()}
              className="px-3 py-1.5 rounded-md bg-primary text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingNote ? "Saving..." : "Add Note"}
            </button>
          </div>
        </form>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 max-h-[320px] overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notes yet. Start by adding one above.
            </p>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="p-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <NoteTypeBadge noteType={n.note_type || "general"} />
                  {(onEditNote || onDeleteNote) && (
                    <div className="ml-auto flex items-center gap-1">
                      {onEditNote && (
                        <button
                          type="button"
                          onClick={() => onEditNote(n)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteNote && (
                        <button
                          type="button"
                          onClick={() => onDeleteNote(n.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {n.note}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{n.user_email.split("@")[0]}</span>
                  <span>{formatDate(n.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
