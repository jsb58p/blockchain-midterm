import React, { useEffect, useState } from "react";
import { getContracts } from "@lib/eth";
import { CFG } from "@lib/config";

type DeviceRow = {
  address: string;
  metaCid?: string;
  status: "OK" | "WARN" | "UNKNOWN";
  lastBatch?: { start: number; end: number; cid?: string };
};

export default function DeviceTable() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Strategy:
        // 1) Pull known devices:
        //    - If backend exists, GET /devices (expected: [{address, metaCid}]).
        //    - Else: derive from past DeviceAdded events (optional; omitted for brevity).
        let devices: Array<{ address: string; metaCid?: string }> = [];
        if (CFG.backendUrl) {
          try {
            const res = await fetch(`${CFG.backendUrl}/devices`);
            if (res.ok) devices = await res.json();
          } catch {}
        }

        // Fallback demo device (so the table isn’t empty on first run)
        if (devices.length === 0) {
          devices = [{ address: "0x0000000000000000000000000000000000000000", metaCid: "" }];
        }

        // Optionally fetch last batch info per device from backend
        const rows: DeviceRow[] = [];
        for (const d of devices) {
          let lastBatch: DeviceRow["lastBatch"] | undefined = undefined;
          if (CFG.backendUrl) {
            try {
              const res = await fetch(`${CFG.backendUrl}/latest-batch?device=${d.address}`);
              if (res.ok) {
                const data = await res.json();
                lastBatch = { start: data.window?.start, end: data.window?.end, cid: data.cid };
              }
            } catch {}
          }
          rows.push({ address: d.address, metaCid: d.metaCid, status: "UNKNOWN", lastBatch });
        }
        setRows(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="panel card">
      <h3>Devices</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Meta (CID)</th>
            <th>Status</th>
            <th>Last Batch</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={4}>Loading…</td></tr>
          )}
          {!loading && rows.map((r, i) => (
            <tr key={i}>
              <td>{r.address}</td>
              <td>
                {r.metaCid ? (
                  <a href={`https://ipfs.io/ipfs/${r.metaCid}`} target="_blank" rel="noreferrer">{r.metaCid}</a>
                ) : <span className="kv">—</span>}
              </td>
              <td><span className={`badge ${r.status === "OK" ? "ok" : r.status === "WARN" ? "warn" : ""}`}>{r.status}</span></td>
              <td className="kv">
                {r.lastBatch
                  ? (<>
                      <b>{r.lastBatch.start}</b> → <b>{r.lastBatch.end}</b>
                      {r.lastBatch.cid && <> · <a href={`https://ipfs.io/ipfs/${r.lastBatch.cid}`} target="_blank" rel="noreferrer">batch</a></>}
                    </>)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="kv" style={{ marginTop: 8 }}>
        Tip: hook your backend’s <code>/devices</code> and <code>/latest-batch</code> endpoints to populate live data.
      </div>
    </div>
  );
}

