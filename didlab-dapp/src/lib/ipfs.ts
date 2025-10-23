export type BatchJson = {
  device: string;
  window: { start: number; end: number };
  count: number;
  readings: Array<{ t: number; temp: number; hum: number; sig: string }>;
  sig?: string;
};

export async function fetchIpfsJson(cid: string): Promise<any> {
  // Use a public gateway; you can swap to your own gateway for reliability.
  const url = `https://ipfs.io/ipfs/${cid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`IPFS fetch failed (${res.status})`);
  return res.json();
}

