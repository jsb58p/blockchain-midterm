import React from "react";

export function Header({ account, onConnect }: { account?: string; onConnect: () => void }) {
  return (
    <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <h2>SensorSeal Dashboard</h2>
        <div className="kv">Cold-chain integrity • On-chain anchoring • IPFS verification</div>
      </div>
      <div>
        {account ? (
          <span className="badge ok">{account.slice(0, 6)}…{account.slice(-4)}</span>
        ) : (
          <button className="primary" onClick={onConnect}>Connect Wallet</button>
        )}
      </div>
    </div>
  );
}

