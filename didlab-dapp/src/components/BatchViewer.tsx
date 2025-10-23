import React, { useEffect, useState } from "react";
import { fetchIpfsJson } from "@lib/ipfs";

export default function BatchViewer() {
  const [cid, setCid] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setData(null);
    try {
      const j = await fetchIpfsJson(cid.trim());
      setData(j);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load batch JSON");
    }
  }

  return (
    <div className="panel card">
      <h3>Batch Viewer</h3>
      <div className="input-row">
        <input placeholder="Enter batch CID (e.g., bafy...)" value={cid} onChange={(e) => setCid(e.target.value)} />
        <button className="primary" onClick={load}>Load</button>
      </div>
      {err && (<div style={{ marginTop: 8 }} className="badge danger">Error: {err}</div>)}
      {data && (
        <>
          <hr />
          <div className="kv">
            <div><b>Device</b>: {data.device}</div>
            <div><b>Window</b>: {data.window?.start} → {data.window?.end}</div>
            <div><b>Count</b>: {data.count}</div>
          </div>
          <hr />
          <div className="kv">First 3 readings:</div>
          <pre className="panel" style={{ overflow: "auto", maxHeight: 260 }}>
{JSON.stringify((data.readings || []).slice(0, 3), null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

