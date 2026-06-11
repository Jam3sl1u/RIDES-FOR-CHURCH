"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { routeIndex } from "@church-rides/types";

type Rider = {
  memberId: string;
  driverId: string | null;
  fullName: string;
  phoneNumber: string;
  pickupLocation: string;
};

type Driver = {
  id: string;
  fullName: string;
  pickupZone: string;
  seatsAvailable: number;
};

export default function AssignmentsBoard({
  week,
  drivers,
  initialAssignments,
  initialUnassigned,
}: {
  week: string;
  drivers: Driver[];
  initialAssignments: Rider[];
  initialUnassigned: Rider[];
}) {
  const [riders, setRiders] = useState<Rider[]>([...initialAssignments, ...initialUnassigned]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const router = useRouter();

  const inCar = (driverId: string | null) =>
    riders
      .filter((r) => r.driverId === driverId)
      .sort((a, b) => routeIndex(a.pickupLocation) - routeIndex(b.pickupLocation));

  async function move(memberId: string, driverId: string | null) {
    const rider = riders.find((r) => r.memberId === memberId);
    if (!rider || rider.driverId === driverId) return;

    const previous = riders;
    setRiders((rs) => rs.map((r) => (r.memberId === memberId ? { ...r, driverId } : r)));

    const res = await fetch("/api/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, driverId, week }),
    });
    if (!res.ok) setRiders(previous); // roll back if the save failed
  }

  async function runAlgorithm() {
    setRunning(true);
    await fetch("/api/assignments", { method: "POST" });
    setRunning(false);
    router.refresh();
    location.reload();
  }

  function column(driver: Driver | null) {
    const id = driver?.id ?? null;
    const key = id ?? "unassigned";
    const list = inCar(id);
    const over = overCol === key;
    const full = driver ? list.length >= driver.seatsAvailable : false;

    return (
      <div
        key={key}
        onDragOver={(e) => { e.preventDefault(); setOverCol(key); }}
        onDragLeave={() => setOverCol((c) => (c === key ? null : c))}
        onDrop={(e) => {
          e.preventDefault();
          setOverCol(null);
          const memberId = e.dataTransfer.getData("text/plain");
          if (memberId) move(memberId, id);
        }}
        className={`card flex min-h-[160px] flex-col p-4 transition ${over ? "ring-2 ring-gold" : ""}`}
      >
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">{driver ? driver.fullName : "Needs a ride"}</h3>
          <span className={`text-xs ${full ? "font-semibold text-red-700" : "text-navy-muted"}`}>
            {driver ? `${list.length}/${driver.seatsAvailable} seats · ${driver.pickupZone}` : `${list.length} waiting`}
          </span>
        </div>
        <ul className="mt-3 flex-1 space-y-2">
          {list.map((r) => (
            <li
              key={r.memberId}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", r.memberId);
                setDragging(r.memberId);
              }}
              onDragEnd={() => setDragging(null)}
              className={`cursor-grab rounded-lg border border-navy/10 bg-parchment px-3 py-2 text-sm active:cursor-grabbing ${
                dragging === r.memberId ? "opacity-50" : ""
              }`}
            >
              <p className="font-medium">{r.fullName}</p>
              <p className="text-xs text-navy-muted">{r.pickupLocation} · {r.phoneNumber}</p>
            </li>
          ))}
          {list.length === 0 && (
            <li className="rounded-lg border border-dashed border-navy/20 px-3 py-4 text-center text-xs text-navy-muted">
              Drop a rider here
            </li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={runAlgorithm} disabled={running}>
          {running ? "Assigning…" : "⚡ Run auto-assignment"}
        </button>
        <p className="text-sm text-navy-muted">
          Route order: Mesa → UTC → Midway → PV1 → PV2 → Vdcn → Camino → VDC
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {column(null)}
        {drivers.map((d) => column(d))}
      </div>

      {drivers.length === 0 && (
        <p className="text-sm text-navy-muted">
          No available drivers this week — mark drivers as available on the Drivers page first.
        </p>
      )}
    </div>
  );
}
