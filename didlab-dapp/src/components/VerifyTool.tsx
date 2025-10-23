import React, { useState } from "react";
import { getContracts, hashCid } from "@lib/eth";
import { ethers } from "ethers";

export default function VerifyTool() {
  const [cid, setCid] = useState("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [device, setDevice] = useState<string>("");
  const [result, setResult] = useState<string>("");

  async function verify() {
    setResult("Verifying…");
    try {
      const { anchor } = await getContracts();
      const topic = ethers.id("BatchCommitted(address,bytes32,uint64,uint64)"); // event signature
      const devTopic = ethers.zeroPadValue(device as `0x${string}`, 32);

      // Simple filter by device (topic[1]); if your node supports, use contract.queryFilter instead.
      const logs = await anchor.runner.provider.getLogs({
        address: await anchor.getAddress(),
        fromBlock: 0n,
        toBlock: "latest",
        topics: [topic, devTopic]
      });

      const expectedHash = hashCid(cid.trim());
      const s = BigInt(start || "0");
      const e = BigInt(end || "0");

      // Decode and check for a matching record
      const iface = new ethers.Interface([
        "event BatchCommitted(address indexed device, bytes32 cidHash, uint64 start, uint64 end)"
      ]);
      const match = logs.find((lg) => {
        const parsed = iface.parseLog({ topics: lg.topics as string[], data: lg.data });
        const onCid = parsed?.args?.cidHash?.toLowerCase?.();
        const onStart = BigInt(parsed?.args?.start ?? 0);
        const onEnd = BigInt(parsed?.args?.end ?? 0);
        return onCid === expectedHash.toLowerCase() && onStart === s && onEnd === e;
      });

      if (match) {
        setResult("✅ Verified: on-chain anchor matches provided CID/start/end.");
      } else {
        setResult("❌ No matching on-chain anchor found for the provided inputs.");
      }
    } catch (e: any) {
      setResult(`Error: ${e?.message ?? e}`);
    }
  }

  return (
    <div className="panel card">
      <h3>Verify Batch ↔ On-Chain</h3>
      <div className="input-row">
        <input placeholder="Device address (0x…)" value={device} onChange={(e) => setDevice(e.target.value)} />
        <input placeholder="Start (unix sec)" value={start} onChange={(e) => setStart(e.target.value)} />
        <input placeholder="End (unix sec)" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <div className="input-row" style={{ marginTop: 8 }}>
        <input placeholder="Batch CID (e.g., bafy…)" value={cid} onChange={(e) => setCid(e.target.value)} />
        <button className="primary" onClick={verify}>Verify</button>
      </div>
      {result && <div style={{ marginTop: 10 }}>{result}</div>}
      <div className="kv" style={{ marginTop: 8 }}>
        Note: this expects the on-chain anchor stored <i>keccak256(utf8(CID))</i>. If you anchored the raw multihash bytes,
        swap <code>hashCid</code> in <code>lib/eth.ts</code> to match your scheme.
      </div>
    </div>
  );
}

