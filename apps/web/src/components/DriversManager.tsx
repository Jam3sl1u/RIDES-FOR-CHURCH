"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PICKUP_ROUTE } from "@church-rides/types";

type Driver = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  discordId: string | null;
  pickupZone: string;
  seatsAvailable: number;
  isAvailableThisWeek: boolean;
};

const empty = {
  fullName: "",
  phoneNumber: "",
  email: "",
  discordId: "",
  pickupZone: "Mesa",
  seatsAvailable: 4,
};

export default function DriversManager({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [form, setForm] = useState<typeof empty & { id?: string }>(empty);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggleAvailability(d: Driver) {
    const res = await fetch(`/api/drivers/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailableThisWeek: !d.isAvailableThisWeek }),
    });
    if (res.ok) {
      setDrivers((ds) =>
        ds.map((x) => (x.id === d.id ? { ...x, isAvailableThisWeek: !d.isAvailableThisWeek } : x))
      );
      router.refresh();
    }
  }

  async function save() {
    setError(null);
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/drivers/${form.id}` : "/api/drivers", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Couldn't save driver.");
      return;
    }
    const saved = await res.json();
    setDrivers((ds) =>
      isEdit ? ds.map((d) => (d.id === saved.id ? saved : d)) : [...ds, saved].sort((a, b) => a.fullName.localeCompare(b.fullName))
    );
    setOpen(false);
    setForm(empty);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this driver? Their past assignments are removed too.")) return;
    await fetch(`/api/drivers/${id}`, { method: "DELETE" });
    setDrivers((ds) => ds.filter((d) => d.id !== id));
    router.refresh();
  }

  function edit(d: Driver) {
    setForm({
      id: d.id,
      fullName: d.fullName,
      phoneNumber: d.phoneNumber,
      email: d.email ?? "",
      discordId: d.discordId ?? "",
      pickupZone: d.pickupZone,
      seatsAvailable: d.seatsAvailable,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <button className="btn-primary" onClick={() => { setForm(empty); setOpen(true); }}>
        + Add driver
      </button>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-navy/10">
          <thead className="bg-parchment">
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Email</th>
              <th className="th">Zone</th>
              <th className="th">Seats</th>
              <th className="th">This week</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {drivers.map((d) => (
              <tr key={d.id}>
                <td className="td font-medium">{d.fullName}</td>
                <td className="td">{d.phoneNumber}</td>
                <td className="td text-navy-muted">{d.email ?? "—"}</td>
                <td className="td">{d.pickupZone}</td>
                <td className="td">{d.seatsAvailable}</td>
                <td className="td">
                  <button
                    role="switch"
                    aria-checked={d.isAvailableThisWeek}
                    onClick={() => toggleAvailability(d)}
                    className={`relative h-6 w-11 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      d.isAvailableThisWeek ? "bg-navy" : "bg-navy/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        d.isAvailableThisWeek ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </td>
                <td className="td whitespace-nowrap text-right">
                  <button className="btn-ghost mr-2" onClick={() => edit(d)}>Edit</button>
                  <button className="btn-ghost text-red-700" onClick={() => remove(d.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td className="td text-navy-muted" colSpan={7}>
                  No drivers yet. Add your first driver to start assigning rides.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold">{form.id ? "Edit driver" : "Add driver"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="text-navy-muted">Full name</span>
                <input className="input mt-1" value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Phone (US)</span>
                <input className="input mt-1" placeholder="(619) 555-0101" value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Email (for backup notice)</span>
                <input className="input mt-1" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Discord user ID (for DMs)</span>
                <input className="input mt-1" value={form.discordId}
                  onChange={(e) => setForm({ ...form, discordId: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Pickup zone</span>
                <select className="input mt-1" value={form.pickupZone}
                  onChange={(e) => setForm({ ...form, pickupZone: e.target.value })}>
                  {PICKUP_ROUTE.map((loc) => <option key={loc}>{loc}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-navy-muted">Seats available</span>
                <input className="input mt-1" type="number" min={1} max={15} value={form.seatsAvailable}
                  onChange={(e) => setForm({ ...form, seatsAvailable: Number(e.target.value) })} />
              </label>
              {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>
                {form.id ? "Save changes" : "Add driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
