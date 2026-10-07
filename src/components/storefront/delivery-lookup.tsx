"use client";

import { useState } from "react";

export interface DivisionDelivery {
  division: string;
  route?: { name: string; days: string; cutoff: string };
}

/** Division → existing delivery route (sample data). No invented schedules: unmatched divisions say so. */
export function DeliveryLookup({ divisions }: { divisions: DivisionDelivery[] }) {
  const [selected, setSelected] = useState("");
  const match = divisions.find((d) => d.division === selected);
  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <label htmlFor="delivery-division" className="mb-1.5 block text-sm font-medium">Your division</label>
        <select
          id="delivery-division"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-describedby="delivery-result"
          className="h-10 w-full rounded-ui border border-line bg-surface px-3 text-base sm:text-sm"
        >
          <option value="">Select your division</option>
          {divisions.map((d) => <option key={d.division} value={d.division}>{d.division}</option>)}
        </select>
      </div>
      <div id="delivery-result" role="status" aria-live="polite" className="min-h-16 text-sm">
        {!match ? (
          <p className="text-muted">Choose a division to see its delivery route.</p>
        ) : match.route ? (
          <div className="rounded-ui border border-line bg-surface p-3">
            <p className="font-semibold">{match.route.name}</p>
            <p className="text-muted">Delivery days: {match.route.days}</p>
            <p className="text-muted">Order by {match.route.cutoff} the day before delivery.</p>
            <p className="mt-1 text-xs text-muted">Sample route data for this demo — delivery charges are confirmed when you order.</p>
          </div>
        ) : (
          <p className="rounded-ui border border-line bg-surface p-3 text-muted">No delivery route is scheduled for {match.division} yet. Please contact our team.</p>
        )}
      </div>
    </div>
  );
}
