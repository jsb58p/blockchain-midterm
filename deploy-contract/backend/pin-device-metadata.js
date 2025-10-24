// pin-device-metadata.js - Generate and pin device metadata to IPFS
import { privateKeyToAccount } from 'viem/accounts';
import { create } from 'kubo-rpc-client';
import dotenv from 'dotenv';

dotenv.config();

const DEVICE_PRIVATE_KEY = process.env.DEVICE_PRIVATE_KEY?.replace(/^0x/, '');
const ADMIN_PRIVATE_KEY = process.env.PRIVATE_KEY?.replace(/^0x/, '');
const TRACE_TOKEN_ID = Number(process.env.TRACE_TOKEN_ID || '1');
const IPFS_URL = process.env.IPFS_URL || 'https://ipfs.didlab.org/api/v0';

if (!DEVICE_PRIVATE_KEY || !ADMIN_PRIVATE_KEY) {
  console.error('Error: Missing DEVICE_PRIVATE_KEY or PRIVATE_KEY in .env');
  process.exit(1);
}

const deviceAccount = privateKeyToAccount(`0x${DEVICE_PRIVATE_KEY}`);
const adminAccount = privateKeyToAccount(`0x${ADMIN_PRIVATE_KEY}`);

// D1) Device metadata from spec
const deviceMetadata = {
  make: "DIDTemp100",
  model: "v1",
  pubkey: deviceAccount.address,
  owner: adminAccount.address,
  traceTokenId: TRACE_TOKEN_ID
};

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Pin Device Metadata to IPFS                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Device Metadata:');
  console.log(JSON.stringify(deviceMetadata, null, 2));
  console.log('\n');

  console.log('📌 Pinning to IPFS...');
  try {
    const ipfs = create({ url: IPFS_URL });
    const result = await ipfs.add(JSON.stringify(deviceMetadata, null, 2));
    const cid = result.cid.toString();
    
    console.log(`✓ Pinned successfully!\n`);
    console.log(`IPFS CID: ${cid}`);
    console.log(`IPFS URL: https://ipfs.io/ipfs/${cid}\n`);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Add this to your .env file:\n');
    console.log(`DEVICE_METADATA_CID=${cid}`);
    console.log('════════════════════════════════════════════════════════════════\n');
  } catch (e) {
    console.error('✗ IPFS pinning failed:', e.message);
    console.log('\nManually pin this JSON to IPFS:');
    console.log(JSON.stringify(deviceMetadata, null, 2));
    process.exit(1);
  }
}

main().catch(console.error);