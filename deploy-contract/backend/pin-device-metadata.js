// pin-device-metadata.js - Generate and pin device metadata to IPFS via DIDLab API
import { privateKeyToAccount, signMessage } from 'viem/accounts';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

const DEVICE_PRIVATE_KEY = process.env.DEVICE_PRIVATE_KEY?.replace(/^0x/, '');
const ADMIN_PRIVATE_KEY = process.env.PRIVATE_KEY?.replace(/^0x/, '');
const TRACE_TOKEN_ID = Number(process.env.TRACE_TOKEN_ID || '1');

if (!DEVICE_PRIVATE_KEY || !ADMIN_PRIVATE_KEY) {
  console.error('Error: Missing DEVICE_PRIVATE_KEY or PRIVATE_KEY in .env');
  process.exit(1);
}

const deviceAccount = privateKeyToAccount(`0x${DEVICE_PRIVATE_KEY}`);
const adminAccount = privateKeyToAccount(`0x${ADMIN_PRIVATE_KEY}`);

const deviceMetadata = {
  make: "DIDTemp100",
  model: "v1",
  pubkey: deviceAccount.address,
  owner: adminAccount.address,
  traceTokenId: TRACE_TOKEN_ID
};

async function getSIWEToken(address, privateKey) {
  // Step 1: Get SIWE challenge
  const prepareRes = await fetch('https://api.didlab.org/v1/siwe/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  
  if (!prepareRes.ok) {
    throw new Error(`SIWE prepare failed: ${prepareRes.status}`);
  }
  
  const { message } = await prepareRes.json();
  
  // Step 2: Sign the message
  const signature = await signMessage({
    message,
    privateKey: `0x${privateKey}`
  });
  
  // Step 3: Verify and get token
  const verifyRes = await fetch('https://api.didlab.org/v1/siwe/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature })
  });
  
  if (!verifyRes.ok) {
    throw new Error(`SIWE verify failed: ${verifyRes.status}`);
  }
  
  const { token } = await verifyRes.json();
  return token;
}

async function uploadToIPFS(token, data) {
  const form = new FormData();
  form.append('file', Buffer.from(JSON.stringify(data, null, 2)), {
    filename: 'device-metadata.json',
    contentType: 'application/json'
  });
  form.append('pin', 'true');
  
  const uploadRes = await fetch('https://api.didlab.org/v1/ipfs/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });
  
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${errorText}`);
  }
  
  return await uploadRes.json();
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          Pin Device Metadata to IPFS via DIDLab API           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('Device Metadata:');
  console.log(JSON.stringify(deviceMetadata, null, 2));
  console.log('\n');
  
  try {
    console.log('🔐 Authenticating with SIWE...');
    const token = await getSIWEToken(adminAccount.address, ADMIN_PRIVATE_KEY);
    console.log('✓ Authentication successful\n');
    
    console.log('📌 Uploading to IPFS...');
    const result = await uploadToIPFS(token, deviceMetadata);
    
    if (!result.cid) {
      throw new Error('Upload failed: No CID returned');
    }
    
    console.log(`✓ Pinned successfully!\n`);
    console.log(`IPFS CID: ${result.cid}`);
    console.log(`Bundle CID: ${result.bundleCid || 'N/A'}`);
    console.log(`Gateway URL: https://gateway.didlab.org/ipfs/${result.cid}\n`);
    
    console.log('════════════════════════════════════════════════════════════════');
    console.log('Add this to your .env file:\n');
    console.log(`DEVICE_METADATA_CID=${result.cid}`);
    console.log('════════════════════════════════════════════════════════════════\n');
    
  } catch (e) {
    console.error('✗ Failed:', e.message);
    console.log('\nIf authentication failed, ensure your wallet has interacted with DIDLab before.');
    process.exit(1);
  }
}

main().catch(console.error);