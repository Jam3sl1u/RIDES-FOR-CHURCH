"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PICKUP_ROUTE } from "@church-rides/types";

type Member = {
  id: string;
  discordUsername: string;
  fullName: string;
  phoneNumber: string;
  pickupLocation: string;
  preferences: string | null;
  createdAt: string;
};

export default function MembersTable({ initialMembers }: { initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(needle) ||
        m.discordUsername.toLowerCase().includes(needle) ||
        m.phoneNumber.includes(q) ||
        m.pickupLocation.toLowerCase().includes(needle)
    );
  }, [members, q]);

  async function save() {
    if (!editing) return;
    setError(null);
    const res = await fetch(`/api/members/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: editing.fullName,
        phoneNumber: editing.phoneNumber,
        pickupLocation: editing.pickupLocation,
        preferences: editing.preferences,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Couldn't save changes.");
      return;
    }
    const updated = await res.json();
    setMembers((ms) => ms.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this member? Their ride history is removed too.")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    setMembers((ms) => ms.filter((m) => m.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input
        className="input max-w-sm"
        placeholder="Search by name, Discord, phone, or location…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-navy/10">
          <thead className="bg-parchment">
            <tr>
              <th className="th">Name</th>
              <th className="th">Discord</th>
              <th className="th">Phone</th>
              <th className="th">Pickup</th>
              <th className="th">Preferences</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="td font-medium">{m.fullName}</td>
                <td className="td text-navy-muted">@{m.discordUsername}</td>
                <td className="td">{m.phoneNumber}</td>
                <td className="td">{m.pickupLocation}</td>
                <td className="td max-w-[240px] truncate text-navy-muted">{m.preferences ?? "—"}</td>
                <td className="td whitespace-nowrap text-right">
                  <button className="btn-ghost mr-2" onClick={() => setEditing({ ...m })}>Edit</button>
                  <button className="btn-ghost text-red-700" onClick={() => remove(m.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-navy-muted" colSpan={6}>
                  {members.length === 0
                    ? "No members yet — they appear here after registering in #rides-signup."
                    : "No members match that search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold">Edit member</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-navy-muted">Full name</span>
                <input className="input mt-1" value={editing.fullName}
                  onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Phone (US)</span>
                <input className="input mt-1" value={editing.phoneNumber}
                  onChange={(e) => setEditing({ ...editing, phoneNumber: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Pickup location</span>
                <select className="input mt-1" value={editing.pickupLocation}
                  onChange={(e) => setEditing({ ...editing, pickupLocation: e.target.value })}>
                  {PICKUP_ROUTE.map((loc) => <option key={loc}>{loc}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Preferences</span>
                <textarea className="input mt-1" rows={2} value={editing.preferences ?? ""}
                  onChange={(e) => setEditing({ ...editing, preferences: e.target.value })} />
              </label>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
