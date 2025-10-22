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
  // Load the compiled contract
  const { abi, bytecode } = await artifacts.readArtifact("AgriSensorData");
  const validBytecode = bytecode as `0x${string}`;

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

  console.log("═══════════════════════════════════════════════");
  console.log("Deploying AgriSensorData Contract");
  console.log("═══════════════════════════════════════════════");
  console.log(`Network: ${chain.name} (Chain ID: ${CHAIN_ID})`);
  console.log(`Deployer: ${account.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log("───────────────────────────────────────────────");

  // Deploy the contract (no constructor args needed)
  const hash = await wallet.deployContract({
    abi,
    bytecode: validBytecode,
    args: [], // AgriSensorData constructor takes no arguments
    gasPrice: 20_000_000_000n, // 20 gwei - legacy transaction format
  });

  console.log(`✓ Deploy transaction sent: ${hash}`);
  console.log("  Waiting for confirmation...");

  // Wait for the transaction to be mined
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("───────────────────────────────────────────────");
  console.log("✓ Contract deployed successfully!");
  console.log("═══════════════════════════════════════════════");
  console.log(`Contract Address: ${rcpt.contractAddress}`);
  console.log(`Block Number: ${rcpt.blockNumber}`);
  console.log(`Gas Used: ${rcpt.gasUsed}`);
  console.log("═══════════════════════════════════════════════");
  console.log("\nAdd this to your .env file:");
  console.log(`SENSOR_CONTRACT_ADDRESS=${rcpt.contractAddress}`);
  console.log("\nDefault roles granted to deployer:");
  console.log("  - DEFAULT_ADMIN_ROLE");
  console.log("  - DEVICE_ROLE");
  console.log("  - FARMER_ROLE");
  console.log("  - RESEARCHER_ROLE");
  console.log("  - SUPPLY_CHAIN_ROLE");
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("\n❌ Deployment failed:");
  console.error(e);
  process.exit(1);
});
