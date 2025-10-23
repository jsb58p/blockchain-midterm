import React, { useState } from "react";
import { getContracts } from "@lib/eth";

export default function BreachExplorer() {
  const [id, setId] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setUri(null);
    try {
      const { breach } = await getContracts();
      const u = await breach.tokenURI(BigInt(id));
      setUri(u);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to fetch tokenURI");
    }
  }

  return (
    <div className="panel card">
      <h3>Breach Explorer (NFT)</h3>
      <div className="input-row">
        <input placeholder="Breach NFT ID" value={id} onChange={(e) => setId(e.target.value)} />
        <button className="primary" onClick={load}>Load</button>
      </div>
      {err && <div className="badge danger" style={{ marginTop: 8 }}>Error: {err}</div>}
      {uri && (
        <div className="kv" style={{ marginTop: 8 }}>
          <b>tokenURI</b>: {uri.startsWith("ipfs://") ? (
            <a href={`https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`} target="_blank" rel="noreferrer">{uri}</a>
          ) : uri}
        </div>
      )}
    </div>
  );
}

