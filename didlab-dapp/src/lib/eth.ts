// src/lib/eth.ts
import {
  BrowserProvider,
  JsonRpcProvider,
  Contract,
  Eip1193Provider,
  ethers,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import DeviceRegistryAbi from "../abi/DeviceRegistry.json";
import DataAnchorAbi from "../abi/DataAnchor.json";
import BreachNftAbi from "../abi/BreachNFT.json";
import { CFG } from "./config";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export async function ensureNetwork() {
  if (!window.ethereum?.request) return;
  const targetHex = "0x" + CFG.chainId.toString(16);
  try {
    // Try switching first
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (err: any) {
    // If chain is unknown to wallet, add it
    if (err?.code === 4902 || ("" + err?.message).includes("Unrecognized chain ID")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetHex,
            chainName: import.meta.env.VITE_CHAIN_NAME || "DIDLab",
            nativeCurrency: {
              name: import.meta.env.VITE_NATIVE_SYMBOL || "ETH",
              symbol: import.meta.env.VITE_NATIVE_SYMBOL || "ETH",
              decimals: 18,
            },
            rpcUrls: [import.meta.env.VITE_RPC_URL || "https://eth.didlab.org/"],
            blockExplorerUrls: [import.meta.env.VITE_BLOCK_EXPLORER_URL || ""].filter(Boolean),
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export function getReadProvider() {
  // Read-only provider that doesn’t require a wallet
  const url = import.meta.env.VITE_RPC_URL || "https://eth.didlab.org/";
  return new JsonRpcProvider(url, CFG.chainId);
}

export async function getProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) throw new Error("No injected provider (MetaMask) found.");
  await ensureNetwork();
  return new BrowserProvider(window.ethereum);
}

export async function ensureWallet(): Promise<{ provider: BrowserProvider; account: string }> {
  const provider = await getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  return { provider, account: (accounts && accounts[0]) || "" };
}

export async function getContracts(signerOrProvider?: any) {
  const rp = signerOrProvider ?? getReadProvider(); // read provider by default
  const signer = "getSigner" in rp ? await rp.getSigner().catch(() => undefined) : undefined;

  return {
    registry: new Contract(CFG.deviceRegistry, DeviceRegistryAbi as any, signer ?? rp),
    anchor: new Contract(CFG.dataAnchor, DataAnchorAbi as any, signer ?? rp),
    breach: new Contract(CFG.breachNft, BreachNftAbi as any, signer ?? rp),
    signer,
  };
}

export function hashCid(cid: string): string {
  // keccak256 over the UTF-8 CID string (match this to whatever you anchor on-chain)
  return keccak256(toUtf8Bytes(cid));
}

