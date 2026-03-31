"use client";

import { useState, useEffect } from "react";

interface Note {
  path: string;
  content: string;
}

export default function AdminNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [newPath, setNewPath] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch("/api/vault/notes")
      .then(r => r.json())
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function saveNote(path: string, content: string) {
    setSaving(true);
    const res = await fetch("/api/vault/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
    if (res.ok) {
      setFeedback("Saved ✓");
      setTimeout(() => setFeedback(""), 2000);
      // Refresh
      const data = await (await fetch("/api/vault/notes")).json();
      setNotes(Array.isArray(data) ? data : []);
      setEditing(false);
    }
    setSaving(false);
  }

  async function deleteNote(path: string) {
    if (!confirm("Delete this note?")) return;
    await fetch("/api/vault/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    setSelected(null);
    const data = await (await fetch("/api/vault/notes")).json();
    setNotes(Array.isArray(data) ? data : []);
  }

  async function createNote() {
    if (!newPath.trim()) return;
    const path = newPath.endsWith(".md") ? newPath : newPath + ".md";
    await saveNote(path, `# ${path.replace(".md", "")}\n\nCreated ${new Date().toLocaleDateString()}\n`);
    setShowNew(false);
    setNewPath("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">Notes</h1>
          <p className="text-sm text-admin-text3">Cloud notes — syncs to Obsidian vault when PC is on</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium">
          + New Note
        </button>
      </div>

      {feedback && (
        <div className="bg-success/10 border border-success/20 text-success rounded-lg px-4 py-2 text-sm">{feedback}</div>
      )}

      {showNew && (
        <div className="bg-admin-card rounded-xl border border-teal/30 p-4 flex gap-2">
          <input value={newPath} onChange={e => setNewPath(e.target.value)}
            placeholder="Note name (e.g. daily/april-1.md)"
            className="flex-1 px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm"
            onKeyDown={e => e.key === "Enter" && createNote()} />
          <button onClick={createNote} disabled={!newPath.trim()}
            className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium disabled:opacity-40">Create</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Notes list */}
        <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-admin-text3 text-sm">No notes yet. Create one!</div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {notes.map(note => (
                <button key={note.path} onClick={() => { setSelected(note); setEditing(false); setEditContent(note.content); }}
                  className={`w-full px-4 py-3 text-left border-b border-admin-border/30 hover:bg-admin-card-hover text-sm ${
                    selected?.path === note.path ? "bg-teal/10 border-l-2 border-l-teal" : ""
                  }`}>
                  <span className="text-admin-text">{note.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note content */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-admin-card rounded-xl border border-admin-border p-8 text-center text-admin-text3">
              Select a note or create a new one
            </div>
          ) : editing ? (
            <div className="bg-admin-card rounded-xl border border-admin-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-admin-text">{selected.path}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs text-admin-text2 border border-admin-border rounded-lg">Cancel</button>
                  <button onClick={() => saveNote(selected.path, editContent)} disabled={saving}
                    className="px-3 py-1.5 text-xs bg-teal text-white rounded-lg disabled:opacity-40">
                    {saving ? "..." : "Save"}
                  </button>
                </div>
              </div>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                className="w-full h-[60vh] px-4 py-3 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm font-mono resize-none"
              />
            </div>
          ) : (
            <div className="bg-admin-card rounded-xl border border-admin-border p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-admin-text">{selected.path}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(true); setEditContent(selected.content); }}
                    className="px-3 py-1.5 text-xs bg-gold text-white rounded-lg">Edit</button>
                  <button onClick={() => deleteNote(selected.path)}
                    className="px-3 py-1.5 text-xs text-danger border border-danger/20 rounded-lg">Delete</button>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-admin-text2 font-sans">{selected.content}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
