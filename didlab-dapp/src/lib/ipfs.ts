import { Web3Storage, File } from 'web3.storage';
const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN! });

async function putJson(obj: any, name: string) {
  const data = Buffer.from(JSON.stringify(obj));
  const files = [new File([data], `${name}.json`, { type: 'application/json' })];
  const cid = await client.put(files, { wrapWithDirectory: false });
  console.log(name, 'CID:', cid); // store this on-chain / in DB
}

(async () => {
  await putJson(
    { make: "DIDTemp100", model: "v1", pubkey: "0x04...", owner: "0x...", traceTokenId: 12345 },
    "device-meta"
  );
  await putJson(
    { t: 1739577600, temp: 4.2, hum: 54.0, sig: "0x..." },
    "raw-reading"
  );
  await putJson(
    { device:"0xDeViCe...", window:{start:1739577600,end:1739577660}, count:60, readings:[], sig:"0x..." },
    "batch"
  );
})();


