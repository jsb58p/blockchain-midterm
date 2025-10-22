import "dotenv/config";
import { createWalletClient, createPublicClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Environment variables
const RPC_URL = process.env.RPC_URL!;
const CHAIN_ID = Number(process.env.CHAIN_ID!);
const ADMIN_PRIVATE_KEY = (process.env.PRIVKEY || "").replace(/^0x/, "");
const DEVICE_PRIVATE_KEY = (process.env.DEVICE_PRIVATE_KEY || "").replace(/^0x/, "");
const DEVICE_REGISTRY_ADDRESS = process.env.DEVICE_REGISTRY_ADDRESS as `0x${string}`;

// Optional: provide metadata CID and traceTokenId
const METADATA_CID = process.env.DEVICE_METADATA_CID || "QmPlaceholderMetadata123456789";
const TRACE_TOKEN_ID = BigInt(process.env.TRACE_TOKEN_ID || "1");

// Validation
if (!RPC_URL || !CHAIN_ID || !ADMIN_PRIVATE_KEY || !DEVICE_PRIVATE_KEY || !DEVICE_REGISTRY_ADDRESS) {
  console.error('\n❌ Missing required environment variables:');
  if (!RPC_URL) console.error('  RPC_URL');
  if (!CHAIN_ID) console.error('  CHAIN_ID');
  if (!ADMIN_PRIVATE_KEY) console.error('  PRIVKEY (admin key)');
  if (!DEVICE_PRIVATE_KEY) console.error('  DEVICE_PRIVATE_KEY');
  if (!DEVICE_REGISTRY_ADDRESS) console.error('  DEVICE_REGISTRY_ADDRESS');
  console.error('\nGenerate a device key with:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// DeviceRegistry ABI
const DEVICE_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'addDevice',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'deviceAddress', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: 'metadataCID', type: 'string' },
      { name: 'traceTokenId', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'isDeviceActive',
    stateMutability: 'view',
    inputs: [{ name: 'deviceAddress', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'event',
    name: 'DeviceAdded',
    inputs: [
      { indexed: true, name: 'deviceAddress', type: 'address' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'metadataCID', type: 'string' },
      { indexed: false, name: 'traceTokenId', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ]
  }
] as const;

async function main() {
  // Setup blockchain clients
  const chain = {
    id: CHAIN_ID,
    name: `didlab-${CHAIN_ID}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  } as const;

  const adminAccount = privateKeyToAccount(`0x${ADMIN_PRIVATE_KEY}`);
  const deviceAccount = privateKeyToAccount(`0x${DEVICE_PRIVATE_KEY}`);

  const wallet = createWalletClient({
    account: adminAccount,
    chain,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_URL),
  });

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              Device Registration Script                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log(`Network:           ${chain.name} (${CHAIN_ID})`);
  console.log(`Admin (Owner):     ${adminAccount.address}`);
  console.log(`Device Address:    ${deviceAccount.address}`);
  console.log(`Registry Contract: ${DEVICE_REGISTRY_ADDRESS}`);
  console.log(`Metadata CID:      ${METADATA_CID}`);
  console.log(`Trace Token ID:    ${TRACE_TOKEN_ID}`);
  console.log("════════════════════════════════════════════════════════════════\n");

  // Check if device is already registered
  console.log("🔍 Checking if device is already registered...");
  try {
    const isActive = await publicClient.readContract({
      address: DEVICE_REGISTRY_ADDRESS,
      abi: DEVICE_REGISTRY_ABI,
      functionName: 'isDeviceActive',
      args: [deviceAccount.address],
    });

    if (isActive) {
      console.log("⚠️  Device is already registered and active!");
      console.log("\nNothing to do. Device is ready to send readings.\n");
      return;
    }
  } catch (e) {
    // Device likely not registered, continue
  }

  // Register device
  console.log("📝 Registering device on-chain...");
  
  const hash = await wallet.writeContract({
    address: DEVICE_REGISTRY_ADDRESS,
    abi: DEVICE_REGISTRY_ABI,
    functionName: 'addDevice',
    args: [
      deviceAccount.address,  // device address
      adminAccount.address,   // owner (admin in this case)
      METADATA_CID,           // IPFS metadata CID
      TRACE_TOKEN_ID          // Link to Group 1 product
    ],
    gas: 200000n,
    gasPrice: 20000000000n,
  });

  console.log(`  ↳ Transaction: ${hash}`);
  console.log("  ⏳ Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`);
  console.log(`  ✓ Gas used: ${receipt.gasUsed}\n`);

  // Verify registration
  console.log("✅ Verifying registration...");
  const isActive = await publicClient.readContract({
    address: DEVICE_REGISTRY_ADDRESS,
    abi: DEVICE_REGISTRY_ABI,
    functionName: 'isDeviceActive',
    args: [deviceAccount.address],
  });

  if (isActive) {
    console.log("  ✓ Device is now ACTIVE and can send readings!\n");
  } else {
    console.log("  ⚠️  Device registration may have failed. Check transaction.\n");
  }

  console.log("════════════════════════════════════════════════════════════════");
  console.log("✅ Registration Complete!");
  console.log("════════════════════════════════════════════════════════════════\n");

  console.log("📝 Device Information:\n");
  console.log(`Device Address:    ${deviceAccount.address}`);
  console.log(`Device Private Key: ${DEVICE_PRIVATE_KEY}`);
  console.log(`Owner:             ${adminAccount.address}`);
  console.log(`Trace Token ID:    ${TRACE_TOKEN_ID}`);
  console.log("\n════════════════════════════════════════════════════════════════");

  console.log("\n✅ Next Steps:");
  console.log("  1. Make sure backend/.env has:");
  console.log(`     DEVICE_PRIVATE_KEY=${DEVICE_PRIVATE_KEY}`);
  console.log("  2. Start the backend server:");
  console.log("     cd backend && npm start");
  console.log("  3. Start sending readings:");
  console.log("     npm run device");
  console.log("  4. Test breach detection:");
  console.log("     npm run device:breach");
  console.log("\n════════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("\n❌ Registration failed:");
  console.error(e);
  process.exit(1);
});