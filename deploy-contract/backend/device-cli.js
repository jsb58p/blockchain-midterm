// device-cli.js - IoT Device Simulator
import { privateKeyToAccount } from 'viem/accounts';
import { signMessage } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

// ===== Configuration =====
const DEVICE_PRIVATE_KEY = process.env.DEVICE_PRIVATE_KEY?.replace(/^0x/, '');
const API_URL = process.env.API_URL || 'http://localhost:3000';
const SIMULATE_BREACH = process.env.SIMULATE_BREACH === 'true';

if (!DEVICE_PRIVATE_KEY) {
  console.error('Error: DEVICE_PRIVATE_KEY not set in .env');
  process.exit(1);
}

const account = privateKeyToAccount(`0x${DEVICE_PRIVATE_KEY}`);
const deviceAddress = account.address;

console.log(`
╔════════════════════════════════════════╗
║     SensorSeal Device Simulator        ║
╚════════════════════════════════════════╝

  Device Address: ${deviceAddress}
  API Endpoint:   ${API_URL}
  Breach Mode:    ${SIMULATE_BREACH ? 'ENABLED (will send out-of-range temps)' : 'DISABLED'}

  Press Ctrl+C to stop
╚════════════════════════════════════════╝
`);

// ===== Reading Generator =====
function generateReading(forceBreach = false) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  let temp;
  if (forceBreach) {
    // Generate temperature outside safe range [2, 8]
    temp = Math.random() > 0.5 ? 
      (Math.random() * 5 + 10).toFixed(1) :  // 10-15°C (too high)
      (Math.random() * 2 - 1).toFixed(1);    // -1 to 1°C (too low)
  } else {
    // Generate temperature within safe range [2, 8]
    temp = (Math.random() * 6 + 2).toFixed(1); // 2-8°C
  }
  
  const humidity = (Math.random() * 20 + 50).toFixed(1); // 50-70%

  return {
    ts: timestamp,
    temp: parseFloat(temp),
    hum: parseFloat(humidity),
  };
}

// ===== Signing =====
async function signReading(reading) {
  // Create message to sign
  const message = `${reading.ts},${reading.temp},${reading.hum}`;
  
  // Sign with device private key
  const signature = await signMessage({
    message,
    privateKey: `0x${DEVICE_PRIVATE_KEY}`,
  });

  return { ...reading, sig: signature };
}

// ===== Send to API =====
async function sendReading(reading) {
  try {
    const response = await fetch(`${API_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceAddress,
        reading,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`✗ Failed: ${data.error}`);
      return false;
    }

    return true;
  } catch (e) {
    console.error(`✗ Network error: ${e.message}`);
    return false;
  }
}

// ===== Main Loop =====
let readingCount = 0;
let breachCount = 0;
let breachScheduled = false;

async function simulateDevice() {
  // Decide if this reading should be a breach (if breach mode enabled)
  const shouldBreach = SIMULATE_BREACH && !breachScheduled && Math.random() < 0.05; // 5% chance
  
  if (shouldBreach) {
    breachScheduled = true;
    console.log('\n⚠ Next reading will trigger a BREACH...\n');
  }

  // Generate reading
  const reading = generateReading(breachScheduled);
  
  // Sign reading
  const signedReading = await signReading(reading);

  // Determine if this is a breach
  const isBreach = reading.temp < 2 || reading.temp > 8;
  
  // Send to API
  const success = await sendReading(signedReading);

  if (success) {
    readingCount++;
    if (isBreach) {
      breachCount++;
      console.log(`🔴 #${readingCount} | ${new Date().toLocaleTimeString()} | BREACH | Temp: ${reading.temp}°C | Hum: ${reading.hum}%`);
      breachScheduled = false; // Reset for next breach
    } else {
      console.log(`✓ #${readingCount} | ${new Date().toLocaleTimeString()} | OK | Temp: ${reading.temp}°C | Hum: ${reading.hum}%`);
    }
  }

  // Log stats every 10 readings
  if (readingCount % 10 === 0 && readingCount > 0) {
    console.log(`\n📊 Stats: ${readingCount} readings sent, ${breachCount} breaches detected\n`);
  }
}

// ===== CLI Commands =====
const args = process.argv.slice(2);
const command = args[0];

if (command === 'once') {
  // Send a single reading
  await simulateDevice();
  process.exit(0);
} else if (command === 'burst') {
  // Send multiple readings quickly
  const count = parseInt(args[1]) || 10;
  console.log(`Sending ${count} readings in burst mode...\n`);
  
  for (let i = 0; i < count; i++) {
    await simulateDevice();
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between readings
  }
  
  console.log(`\n✓ Burst complete: ${count} readings sent`);
  process.exit(0);
} else if (command === 'help' || command === '-h') {
  console.log(`
Usage:
  node device-cli.js [command] [options]

Commands:
  (none)         Start continuous simulation (1 reading per 5 seconds)
  once           Send a single reading and exit
  burst [N]      Send N readings quickly (default: 10)
  help           Show this help message

Environment Variables:
  DEVICE_PRIVATE_KEY    Device's private key (required)
  API_URL               Backend API URL (default: http://localhost:3000)
  SIMULATE_BREACH       Set to 'true' to occasionally send out-of-range temps

Examples:
  node device-cli.js                    # Continuous mode
  node device-cli.js once               # Single reading
  node device-cli.js burst 100          # Send 100 readings
  SIMULATE_BREACH=true node device-cli.js  # Enable breach simulation
  `);
  process.exit(0);
} else {
  // Continuous mode (default)
  console.log('Starting continuous simulation (1 reading every 5 seconds)...\n');
  
  // Send immediately
  await simulateDevice();
  
  // Then every 5 seconds
  setInterval(() => {
    simulateDevice().catch(console.error);
  }, 5000);
}