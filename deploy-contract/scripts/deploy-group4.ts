import "dotenv/config";
import { artifacts } from "hardhat";
import { createWalletClient, createPublicClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Environment variables
const RPC_URL = process.env.RPC_URL!;
const CHAIN_ID = Number(process.env.CHAIN_ID!);
const PRIVATE_KEY = (process.env.PRIVKEY || "").replace(/^0x/, "");

// Check for missing environment variables
if (!RPC_URL || !CHAIN_ID || !PRIVATE_KEY) {
  console.error('Missing the following environment variables:');
  if (!RPC_URL) console.error('  RPC_URL');
  if (!CHAIN_ID) console.error('  CHAIN_ID');
  if (!PRIVATE_KEY) console.error('  PRIVKEY');
  throw new Error("Missing env vars");
}

async function main() {
  // Define the blockchain network
  const chain = {
    id: CHAIN_ID,
    name: `didlab-${CHAIN_ID}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  } as const;

  // Create account from private key
  const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

  // Create wallet and public clients
  const wallet = createWalletClient({ 
    account, 
    chain, 
    transport: http(RPC_URL) 
  });

  const publicClient = createPublicClient({ 
    chain, 
    transport: http(RPC_URL) 
  });

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║         Group 4 - SensorSeal Contract Deployment              ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log(`Network: ${chain.name} (Chain ID: ${CHAIN_ID})`);
  console.log(`Deployer: ${account.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log("════════════════════════════════════════════════════════════════\n");

  // ===== 1. Deploy DeviceRegistry =====
  console.log("📝 [1/3] Deploying DeviceRegistry...");
  const deviceRegistryArtifact = await artifacts.readArtifact("DeviceRegistry");
  
  const deviceRegistryHash = await wallet.deployContract({
    abi: deviceRegistryArtifact.abi,
    bytecode: deviceRegistryArtifact.bytecode as `0x${string}`,
    args: [],
    gasPrice: 20_000_000_000n,
  });

  console.log(`  ↳ Transaction: ${deviceRegistryHash}`);
  const deviceRegistryReceipt = await publicClient.waitForTransactionReceipt({ 
    hash: deviceRegistryHash 
  });
  const deviceRegistryAddress = deviceRegistryReceipt.contractAddress!;
  console.log(`  ✓ DeviceRegistry deployed at: ${deviceRegistryAddress}`);
  console.log(`  ✓ Block: ${deviceRegistryReceipt.blockNumber}`);
  console.log(`  ✓ Gas used: ${deviceRegistryReceipt.gasUsed}\n`);

  // ===== 2. Deploy DataAnchor =====
  console.log("📝 [2/3] Deploying DataAnchor...");
  const dataAnchorArtifact = await artifacts.readArtifact("DataAnchor");
  
  const dataAnchorHash = await wallet.deployContract({
    abi: dataAnchorArtifact.abi,
    bytecode: dataAnchorArtifact.bytecode as `0x${string}`,
    args: [],
    gasPrice: 20_000_000_000n,
  });

  console.log(`  ↳ Transaction: ${dataAnchorHash}`);
  const dataAnchorReceipt = await publicClient.waitForTransactionReceipt({ 
    hash: dataAnchorHash 
  });
  const dataAnchorAddress = dataAnchorReceipt.contractAddress!;
  console.log(`  ✓ DataAnchor deployed at: ${dataAnchorAddress}`);
  console.log(`  ✓ Block: ${dataAnchorReceipt.blockNumber}`);
  console.log(`  ✓ Gas used: ${dataAnchorReceipt.gasUsed}\n`);

  // ===== 3. Deploy BreachNFT =====
  console.log("📝 [3/3] Deploying BreachNFT...");
  const breachNFTArtifact = await artifacts.readArtifact("BreachNFT");
  
  const breachNFTHash = await wallet.deployContract({
    abi: breachNFTArtifact.abi,
    bytecode: breachNFTArtifact.bytecode as `0x${string}`,
    args: [],
    gasPrice: 20_000_000_000n,
  });

  console.log(`  ↳ Transaction: ${breachNFTHash}`);
  const breachNFTReceipt = await publicClient.waitForTransactionReceipt({ 
    hash: breachNFTHash 
  });
  const breachNFTAddress = breachNFTReceipt.contractAddress!;
  console.log(`  ✓ BreachNFT deployed at: ${breachNFTAddress}`);
  console.log(`  ✓ Block: ${breachNFTReceipt.blockNumber}`);
  console.log(`  ✓ Gas used: ${breachNFTReceipt.gasUsed}\n`);

  // ===== Summary =====
  console.log("════════════════════════════════════════════════════════════════");
  console.log("✅ All contracts deployed successfully!");
  console.log("════════════════════════════════════════════════════════════════\n");

  console.log("📋 Contract Addresses:\n");
  console.log(`DeviceRegistry: ${deviceRegistryAddress}`);
  console.log(`DataAnchor:     ${dataAnchorAddress}`);
  console.log(`BreachNFT:      ${breachNFTAddress}\n`);

  console.log("════════════════════════════════════════════════════════════════");
  console.log("📝 Add these to your backend/.env file:\n");
  console.log(`DEVICE_REGISTRY_ADDRESS=${deviceRegistryAddress}`);
  console.log(`DATA_ANCHOR_ADDRESS=${dataAnchorAddress}`);
  console.log(`BREACH_NFT_ADDRESS=${breachNFTAddress}`);
  console.log(`BREACH_RECIPIENT=${account.address}`);
  console.log("════════════════════════════════════════════════════════════════\n");

  console.log("🔑 Admin Role Info:");
  console.log(`  The deployer (${account.address}) has DEFAULT_ADMIN_ROLE on all contracts.`);
  console.log(`  This address can:`);
  console.log(`    - Register devices (DeviceRegistry.addDevice)`);
  console.log(`    - Commit batches (DataAnchor.commitBatch)`);
  console.log(`    - Mint breach NFTs (BreachNFT.mint)`);
  console.log("\n════════════════════════════════════════════════════════════════");

  console.log("\n✅ Next Steps:");
  console.log("  1. Copy the contract addresses above to backend/.env");
  console.log("  2. Generate a device private key:");
  console.log("     node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.log("  3. Add DEVICE_PRIVATE_KEY to backend/.env");
  console.log("  4. Register the device using the frontend or a script");
  console.log("  5. Start the backend: cd backend && npm start");
  console.log("  6. Start the device simulator: npm run device:breach");
  console.log("\n════════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("\n❌ Deployment failed:");
  console.error(e);
  process.exit(1);
});