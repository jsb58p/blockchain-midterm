// server.js - SensorSeal Backend API
import express from 'express';
import cors from 'cors';
import { createPublicClient, createWalletClient, http, recoverMessageAddress, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { create } from 'kubo-rpc-client';
import dotenv from 'dotenv';
import { signMessage } from 'viem/accounts';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== Configuration =====
const RPC_URL = process.env.RPC_URL || 'https://eth.didlab.org';
const CHAIN_ID = Number(process.env.CHAIN_ID) || 252501;
const PRIVATE_KEY = process.env.PRIVATE_KEY?.replace(/^0x/, '');
const DEVICE_REGISTRY_ADDRESS = process.env.DEVICE_REGISTRY_ADDRESS;
const DATA_ANCHOR_ADDRESS = process.env.DATA_ANCHOR_ADDRESS;
const BREACH_NFT_ADDRESS = process.env.BREACH_NFT_ADDRESS;
const BREACH_RECIPIENT = process.env.BREACH_RECIPIENT; // Address to receive breach NFTs
const IPFS_URL = process.env.IPFS_URL || 'http://127.0.0.1:5001';
const BATCH_INTERVAL = Number(process.env.BATCH_INTERVAL) || 60000; // 60 seconds

// Breach rule configuration
const TEMP_MIN = Number(process.env.TEMP_MIN) || 2;
const TEMP_MAX = Number(process.env.TEMP_MAX) || 8;

// ===== Blockchain Setup =====
const chain = {
  id: CHAIN_ID,
  name: 'DIDLab',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// ===== IPFS Setup =====
let ipfs;
try {
  ipfs = create({ url: IPFS_URL });
  console.log('✓ IPFS client initialized');
} catch (e) {
  console.warn('⚠ IPFS not available. Using mock IPFS:', e.message);
  // Mock IPFS for development
  ipfs = {
    add: async (data) => ({ cid: { toString: () => 'Qm' + Math.random().toString(36).substring(7) } }),
  };
}

// ===== Contract ABIs =====
const DEVICE_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'isDeviceActive',
    stateMutability: 'view',
    inputs: [{ name: 'deviceAddress', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getDevice',
    stateMutability: 'view',
    inputs: [{ name: 'deviceAddress', type: 'address' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'deviceAddress', type: 'address' },
        { name: 'owner', type: 'address' },
        { name: 'metadataCID', type: 'string' },
        { name: 'traceTokenId', type: 'uint256' },
        { name: 'registeredAt', type: 'uint256' },
        { name: 'active', type: 'bool' },
      ],
    }],
  },
];

const DATA_ANCHOR_ABI = [
  {
    type: 'function',
    name: 'commitBatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'device', type: 'address' },
      { name: 'cid', type: 'string' },
      { name: 'windowStart', type: 'uint64' },
      { name: 'windowEnd', type: 'uint64' },
    ],
    outputs: [{ type: 'uint256' }],
  },
];

const BREACH_NFT_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'device', type: 'address' },
      { name: 'traceTokenId', type: 'uint256' },
      { name: 'batchId', type: 'uint256' },
      { name: 'breachType', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
  },
];

// ===== In-Memory Storage =====
const readingsQueue = {}; // deviceAddress => array of readings
const batchHistory = []; // Store batch info for API queries

// ===== Helper Functions =====
function validateReading(reading) {
  if (reading.t === undefined || reading.temp === undefined || reading.hum === undefined || !reading.sig) {
    return false;
  }
  if (typeof reading.temp !== 'number' || typeof reading.hum !== 'number') {
    return false;
  }
  return true;
}

async function verifySignature(reading, deviceAddress) {
  try {
    // Recreate the message that was signed
    const message = `${reading.t},${reading.temp},${reading.hum}`;
    
    // Recover the signer's address
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: reading.sig,
    });

    return recoveredAddress.toLowerCase() === deviceAddress.toLowerCase();
  } catch (e) {
    console.error('Signature verification error:', e.message);
    return false;
  }
}

async function checkDeviceActive(deviceAddress) {
  try {
    const isActive = await publicClient.readContract({
      address: DEVICE_REGISTRY_ADDRESS,
      abi: DEVICE_REGISTRY_ABI,
      functionName: 'isDeviceActive',
      args: [deviceAddress],
    });
    return isActive;
  } catch (e) {
    console.error('Device check error:', e.message);
    return false;
  }
}

function checkBreach(reading) {
  if (reading.temp < TEMP_MIN) {
    return { breach: true, type: 'TEMP_LOW' };
  }
  if (reading.temp > TEMP_MAX) {
    return { breach: true, type: 'TEMP_HIGH' };
  }
  return { breach: false };
}

async function pinToIPFS(data) {
  try {
    const result = await ipfs.add(JSON.stringify(data));
    return result.cid.toString();
  } catch (e) {
    console.error('IPFS pin error:', e.message);
    throw e;
  }
}


// ===== API Routes =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    queuedReadings: Object.values(readingsQueue).reduce((sum, arr) => sum + arr.length, 0),
    batchesCommitted: batchHistory.length,
  });
});

// POST /ingest - Receive and verify signed readings
app.post('/ingest', async (req, res) => {
  try {
    const { deviceId, reading } = req.body;

    if (!deviceId || !reading) {
      return res.status(400).json({ error: 'Missing deviceId or reading' });
    }

    if (!validateReading(reading)) {
      return res.status(400).json({ error: 'Invalid reading format' });
    }

    // Verify signature
    const validSig = await verifySignature(reading, deviceId);
    if (!validSig) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check device is registered and active
    const isActive = await checkDeviceActive(deviceId);
    if (!isActive) {
      return res.status(403).json({ error: 'Device not registered or inactive' });
    }

    // Add to queue
    if (!readingsQueue[deviceId]) {
      readingsQueue[deviceId] = [];
    }
    readingsQueue[deviceId].push(reading);

    console.log(`✓ Reading ingested from ${deviceId.slice(0, 8)}... (temp: ${reading.temp}°C)`);

    res.json({ success: true, queued: readingsQueue[deviceId].length });
  } catch (e) {
    console.error('Ingest error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /batch - Manually trigger batch processing
app.post('/batch', async (req, res) => {
  try {
    await processBatches();
    res.json({ success: true });
  } catch (e) {
    console.error('Batch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /batches - Get batch history
app.get('/batches', (req, res) => {
  res.json(batchHistory);
});

// GET /queue - Get current queue status
app.get('/queue', (req, res) => {
  const status = Object.entries(readingsQueue).map(([device, readings]) => ({
    device,
    count: readings.length,
  }));
  res.json(status);
});

// ===== Batch Processing =====
async function processBatches() {
  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now;
  const windowStart = now - 60; // 60 second window

  for (const [deviceAddress, readings] of Object.entries(readingsQueue)) {
    if (readings.length === 0) continue;

    try {
      console.log(`\n📦 Processing batch for ${deviceAddress.slice(0, 8)}... (${readings.length} readings)`);

      // Get device info for traceTokenId
      const deviceInfo = await publicClient.readContract({
        address: DEVICE_REGISTRY_ADDRESS,
        abi: DEVICE_REGISTRY_ABI,
        functionName: 'getDevice',
        args: [deviceAddress],
      });

      // Create batch JSON
      const batchData = {
        device: deviceAddress,
        window: { start: windowStart, end: windowEnd },
        count: readings.length,
        readings: readings,
        timestamp: now,
      };

      const batchMessage = JSON.stringify(batchData);
      const batchSig = await signMessage({
        message: batchMessage,
        privateKey: `0x${PRIVATE_KEY}`,
      });
      batchData.sig = batchSig;

      // Pin to IPFS
      const cid = await pinToIPFS(batchData);
      console.log(`  IPFS CID: ${cid}`);

      const cidHash = keccak256(toHex(cid));  // ✅ Add this
      
      // Commit to blockchain
      const hash = await walletClient.writeContract({
        address: DATA_ANCHOR_ADDRESS,
        abi: DATA_ANCHOR_ABI,
        functionName: 'commitBatch',
        args: [deviceAddress, cid, BigInt(windowStart), BigInt(windowEnd)],
        gas: 500000n,
        gasPrice: 20000000000n,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ✓ Committed in block ${receipt.blockNumber}`);

      // Store batch info
      batchHistory.push({
        device: deviceAddress,
        cid,
        cidHash,
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        window: { start: windowStart, end: windowEnd },
        count: readings.length,
        timestamp: now,
      });

      // Check for breaches
      for (const reading of readings) {
        const breachCheck = checkBreach(reading);
        if (breachCheck.breach) {
          await handleBreach(deviceAddress, reading, breachCheck.type, deviceInfo.traceTokenId, cid);
        }
      }

      // Clear queue
      readingsQueue[deviceAddress] = [];
    } catch (e) {
      console.error(`  ✗ Batch processing failed for ${deviceAddress}:`, e.message);
    }
  }
}

// ===== Breach Handling =====
async function handleBreach(deviceAddress, reading, breachType, traceTokenId, batchCID) {
  try {
    console.log(`  ⚠ BREACH DETECTED: ${breachType} (temp: ${reading.temp}°C)`);

    // Create breach report
    const breachReport = {
      device: deviceAddress,
      timestamp: reading.t,
      reading: { temp: reading.temp, hum: reading.hum },
      rule: `Temperature must be between ${TEMP_MIN}°C and ${TEMP_MAX}°C`,
      breachType,
      traceTokenId: traceTokenId.toString(),
      batchCID,
      detectedAt: Date.now(),
    };

    // Pin breach report to IPFS
    const reportCID = await pinToIPFS(breachReport);
    const metadataURI = `ipfs://${reportCID}`;
    console.log(`  Breach report IPFS: ${reportCID}`);

    // Mint BreachNFT
    const hash = await walletClient.writeContract({
      address: BREACH_NFT_ADDRESS,
      abi: BREACH_NFT_ABI,
      functionName: 'mint',
      args: [
        BREACH_RECIPIENT || account.address,
        deviceAddress,
        traceTokenId,
        0n, // batchId - would need to get from DataAnchor event
        breachType,
        metadataURI,
      ],
      gas: 500000n,
      gasPrice: 20000000000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✓ BreachNFT minted in block ${receipt.blockNumber}`);
  } catch (e) {
    console.error(`  ✗ Breach handling failed:`, e.message);
  }
}

// ===== Automatic Batch Processing =====
setInterval(() => {
  processBatches().catch(console.error);
}, BATCH_INTERVAL);

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     SensorSeal Backend API             ║
╚════════════════════════════════════════╝
  
  Server:    http://localhost:${PORT}
  Network:   ${chain.name} (${CHAIN_ID})
  Account:   ${account.address}
  
  Contracts:
    DeviceRegistry: ${DEVICE_REGISTRY_ADDRESS || 'NOT SET'}
    DataAnchor:     ${DATA_ANCHOR_ADDRESS || 'NOT SET'}
    BreachNFT:      ${BREACH_NFT_ADDRESS || 'NOT SET'}
  
  IPFS:      ${IPFS_URL}
  
  Breach Rule: ${TEMP_MIN}°C - ${TEMP_MAX}°C
  Batch Interval: ${BATCH_INTERVAL / 1000}s
  
  Ready to receive readings at POST /ingest
╚════════════════════════════════════════╝
  `);
});