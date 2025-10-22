import "dotenv/config";
import { artifacts } from "hardhat";
import { createPublicClient, http, decodeEventLog } from "viem";

// Load environment variables
const RPC_URL = process.env.RPC_URL!;
const CHAIN_ID = Number(process.env.CHAIN_ID!);
const TOKEN = process.env.TOKEN_ADDRESS as `0x${string}`;

async function main() {
  // Validate required environment variables
  if (!RPC_URL || !CHAIN_ID || !TOKEN) {
    throw new Error("Missing env");
  }

  // Load the compiled contract ABI
  const { abi } = await artifacts.readArtifact("CampusCreditV2");

  // Define the blockchain network configuration
  const chain = {
    id: CHAIN_ID,
    name: `didlab-${CHAIN_ID}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } }
  } as const;

  // Create a client to read data from the blockchain
  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_URL)
  });

  // Get the latest block number
  const latest = await publicClient.getBlockNumber();

  // Look back 2000 blocks (or from block 0 if chain is newer)
  const fromBlock = latest > 5000n ? latest - 5000n : 0n;

    // Debug info
  console.log(`Scanning blocks ${fromBlock} to ${latest}`);
  console.log(`Looking for events from contract: ${TOKEN}`);
  
  // Fetch all logs (events) emitted by the token contract
  const logs = await publicClient.getLogs({
    address: TOKEN,
    fromBlock,
    toBlock: "latest"
  });

  // Decode and display each event
  for (const log of logs) {
    try {
      // Decode the raw log data using the contract's ABI
      const ev = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics
      });

      // Print: [Block Number] EventName { arguments }
      console.log(`[${log.blockNumber}] ${ev.eventName}`, ev.args);
    } catch {
      // Skip events that don't match the ABI (if any)
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});