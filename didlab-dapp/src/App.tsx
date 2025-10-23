import React, { useEffect, useState } from "react";
import { Header } from "@components/Header";
import DeviceTable from "@components/DeviceTable";
import BatchViewer from "@components/BatchViewer";
import VerifyTool from "@components/VerifyTool";
import BreachExplorer from "@components/BreachExplorer";
import { ensureWallet } from "@lib/eth";
import { CFG } from "@lib/config";

export default function App() {
  const [account, setAccount] = useState<string | undefined>(undefined);
  const [warn, setWarn] = useState<string | null>(null);

  async function connect() {
    try {
      const { account } = await ensureWallet();
      setAccount(account);
    } catch (e: any) {
      setWarn(e?.message ?? "Failed to connect wallet");
    }
  }

  useEffect(() => {
    // soft warn on chain mismatch
    (async () => {
      try {
        const { ethereum } = window;
        if (!ethereum) return;
        const chainIdHex: string = await ethereum.request!({ method: "eth_chainId" });
        const chainId = Number(chainIdHex);
        if (CFG.chainId && chainId !== CFG.chainId) {
          setWarn(`Connected to chainId=${chainId}, expected ${CFG.chainId}. You can still browse, but transactions may fail.`);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className="container">
      <Header account={account} onConnect={connect} />
      {warn && <div className="panel" style={{ marginTop: 12 }}><span className="badge warn" style={{ marginRight: 8 }}>WARN</span>{warn}</div>}

      <div className="row" style={{ marginTop: 16 }}>
        <DeviceTable />
        <BatchViewer />
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <VerifyTool />
        <BreachExplorer />
      </div>
    </div>
  );
}

