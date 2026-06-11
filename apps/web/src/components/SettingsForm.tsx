"use client";

import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Church = {
  id: string;
  name: string;
  signupChannelId: string;
  weeklyChannelId: string;
  weeklyMessageTemplate: string;
  weeklySendDay: number;
  weeklySendTime: string;
};

export default function SettingsForm({ church }: { church: Church }) {
  const [form, setForm] = useState(church);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setStatus("error");
      setError((await res.json()).error ?? "Couldn't save settings.");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      <label className="block text-sm">
        <span className="text-navy-muted">Church name</span>
        <input className="input mt-1" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-navy-muted">#rides-signup channel ID</span>
          <input className="input mt-1" value={form.signupChannelId}
            onChange={(e) => setForm({ ...form, signupChannelId: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="text-navy-muted">#rides-this-week channel ID</span>
          <input className="input mt-1" value={form.weeklyChannelId}
            onChange={(e) => setForm({ ...form, weeklyChannelId: e.target.value })} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-navy-muted">Weekly message</span>
        <textarea className="input mt-1" rows={3} value={form.weeklyMessageTemplate}
          onChange={(e) => setForm({ ...form, weeklyMessageTemplate: e.target.value })} />
        <span className="mt-1 block text-xs text-navy-muted">
          Posted with a ✅ reaction. Reactions are collected until Saturday 10:00 AM.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-navy-muted">Send day</span>
          <select className="input mt-1" value={form.weeklySendDay}
            onChange={(e) => setForm({ ...form, weeklySendDay: Number(e.target.value) })}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-navy-muted">Send time (24h)</span>
          <input className="input mt-1" type="time" value={form.weeklySendTime}
            onChange={(e) => setForm({ ...form, weeklySendTime: e.target.value })} />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button className="btn-primary" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save settings"}
        </button>
        {status === "saved" && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>
    </div>
  );
}
