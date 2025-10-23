// src/lib/config.ts
export const CFG = {
  backendUrl: import.meta.env.VITE_BACKEND_URL as string | undefined,
  deviceRegistry: import.meta.env.VITE_DEVICE_REGISTRY as string,
  dataAnchor: import.meta.env.VITE_DATA_ANCHOR as string,
  breachNft: import.meta.env.VITE_BREACH_NFT as string,
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? "252501"),
};

