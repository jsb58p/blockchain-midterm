# Group 4 - SensorSeal Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Hardhat project set up
- MetaMask with DIDLab network configured
- Admin private key with native TT (ETH) on DIDLab network

---

## Step 1: Install Dependencies

### Root Dependencies (Hardhat)
```bash
npm install
```

### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

---

## Step 2: Configure Environment Variables

### Root `.env` (for contract deployment)
Create or update `deploy-contract/.env`:

```bash
# Blockchain Configuration
RPC_URL=https://eth.didlab.org
CHAIN_ID=252501
PRIVKEY=your_admin_private_key_here

# Contract Addresses (will be filled after deployment)
DEVICE_REGISTRY_ADDRESS=
DATA_ANCHOR_ADDRESS=
BREACH_NFT_ADDRESS=

# Device Configuration (will be filled after generating key)
DEVICE_PRIVATE_KEY=
DEVICE_METADATA_CID=QmPlaceholder123
TRACE_TOKEN_ID=1
```

### Backend `.env` (for API server)
Create `deploy-contract/backend/.env`:

```bash
# Blockchain Configuration
RPC_URL=https://eth.didlab.org
CHAIN_ID=252501
PRIVATE_KEY=your_admin_private_key_here

# Contract Addresses (will be filled after deployment)
DEVICE_REGISTRY_ADDRESS=
DATA_ANCHOR_ADDRESS=
BREACH_NFT_ADDRESS=
BREACH_RECIPIENT=your_admin_address_here

# IPFS Configuration
IPFS_URL=https://ipfs.didlab.org/api/v0

# Backend Settings
PORT=3000
BATCH_INTERVAL=60000

# Breach Detection Rules
TEMP_MIN=2
TEMP_MAX=8

# Device Simulator Settings (will be filled after generating key)
DEVICE_PRIVATE_KEY=
API_URL=http://localhost:3000
SIMULATE_BREACH=false
```

---

## Step 3: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 4 Solidity files successfully
```

---

## Step 4: Deploy Contracts

```bash
npx hardhat run scripts/deploy-group4.ts --network didlab
```

**Save the output!** You'll see something like:

```
DeviceRegistry: 0xa631beb88abb91e32a2a6c5d338113acca158baa
DataAnchor:     0x9467d25da30beb222c31d218830a8c87335f3f50
BreachNFT:      0x085a1ec0d51f4541d81a442a0df4c9e9c70d7d1e
```

---

## Step 5: Update Environment Files with Contract Addresses

### Update Root `.env`
```bash
DEVICE_REGISTRY_ADDRESS=0xa631beb88abb91e32a2a6c5d338113acca158baa
DATA_ANCHOR_ADDRESS=0x9467d25da30beb222c31d218830a8c87335f3f50
BREACH_NFT_ADDRESS=0x085a1ec0d51f4541d81a442a0df4c9e9c70d7d1e
```

### Update Backend `.env`
```bash
DEVICE_REGISTRY_ADDRESS=0xa631beb88abb91e32a2a6c5d338113acca158baa
DATA_ANCHOR_ADDRESS=0x9467d25da30beb222c31d218830a8c87335f3f50
BREACH_NFT_ADDRESS=0x085a1ec0d51f4541d81a442a0df4c9e9c70d7d1e
```

**Note:** Use the actual addresses from your deployment output.

---

## Step 6: Generate Device Private Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output:

```
98dba42b1650f578a33418ba6aeb48ea7a5681b156b1e970a0184ca52f05208e
```

- To get device address (for use in DApp):

```
node -e "const {privateKeyToAccount} = require('viem/accounts'); const pk='0xdevice_private_key'; console.log(privateKeyToAccount(pk).address)"
```

Example output:

```
0xad5F4dE5BaC928535b6294945B547801E15C62F7
```

### Add Device Private Key  to Both `.env` Files

**Root `.env`:**
```bash
DEVICE_PRIVATE_KEY=98dba42b1650f578a33418ba6aeb48ea7a5681b156b1e970a0184ca52f05208e
```

**Backend `.env`:**
```bash
DEVICE_PRIVATE_KEY=98dba42b1650f578a33418ba6aeb48ea7a5681b156b1e970a0184ca52f05208e
```

### Run Metadata Pin Script
```bash
cd backend
node pin-device-metadata.js
```

### Update .env with CID
Copy the CID output and add to `backend/.env`:
```
DEVICE_METADATA_CID=<CID_output>
```

---

## Step 7: Configure IPFS

### Use Didlab

Update `backend/.env`:

```bash
IPFS_URL=https://ipfs.didlab.org/api/v0
```

---

## Step 8: Register Device On-Chain

```bash
npx hardhat run scripts/register-device.ts --network didlab
```

Expected output:
```
✓ Device is now ACTIVE and can send readings!
```

If you see `⚠️ Device registration may have failed`, verify that:
- Contract addresses in root `.env` match the deployed addresses
- You have enough ETH for gas
- Admin private key is correct

---

## Step 9: Start Backend Server

In a new terminal:

```bash
cd backend
npm start
```

Expected output:
```
╔════════════════════════════════════════╗
║     SensorSeal Backend API             ║
╚════════════════════════════════════════╝
  
  Server:    http://localhost:3000
  Network:   DIDLab (252501)
  
  Contracts:
    DeviceRegistry: 0xa631beb...
    DataAnchor:     0x9467d25...
    BreachNFT:      0x085a1ec...
  
  Ready to receive readings at POST /ingest
```

---

## Step 10: Start Device Simulator

In another terminal:

```bash
cd backend
npm run device:breach
```

Expected output:
```
✓ #1 | 10:30:45 AM | OK | Temp: 5.2°C | Hum: 62.3%
✓ #2 | 10:30:50 AM | OK | Temp: 6.1°C | Hum: 58.7%
🔴 #3 | 10:30:55 AM | BREACH | Temp: 12.5°C | Hum: 60.3%
```

---

## Step 11: Verify System is Working

### Check Backend Logs

You should see in the backend terminal:

```
✓ Reading ingested from 0xa49c9fc... (temp: 5.2°C)
✓ Reading ingested from 0xa49c9fc... (temp: 6.1°C)
✓ Reading ingested from 0xa49c9fc... (temp: 12.5°C)

📦 Processing batch for 0xa49c9fc... (60 readings)
  IPFS CID: QmXyz789...
  ✓ Committed in block 722345

  ⚠ BREACH DETECTED: TEMP_HIGH (temp: 12.5°C)
  Breach report IPFS: QmBreach...
  ✓ BreachNFT minted in block 722346
```

### Check API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Queue status
curl http://localhost:3000/queue

# Batch history
curl http://localhost:3000/batches
```

---

## Troubleshooting

### "Device not registered or inactive"
- Run Step 8 again (register-device.ts)
- Verify device address matches in both `.env` files

### "IPFS pin error"
- Make sure the IPFS is running (Step 7)

### "Invalid signature"
- Ensure `DEVICE_PRIVATE_KEY` is the same in both `.env` files
- Regenerate key if needed (Step 6)

### "Transaction failed"
- Check you have enough ETH on DIDLab network
- Verify contract addresses are correct
- Ensure admin private key has DEFAULT_ADMIN_ROLE

### Backend crashes
- Check all contract addresses are set in `backend/.env`
- Verify admin private key is correct
- Check IPFS is accessible

---

## Testing Breach Detection

To force breach readings:

```bash
cd backend
SIMULATE_BREACH=true npm run device
```

Or update `backend/.env`:
```bash
SIMULATE_BREACH=true
```

Then run:
```bash
npm run device
```

---

## Quick Command Reference

```bash
# Compile contracts
npx hardhat compile

# Deploy contracts
npx hardhat run scripts/deploy-group4.ts --network didlab

# Register device
npx hardhat run scripts/register-device.ts --network didlab

# Start backend
cd backend && npm start

# Start device simulator
cd backend && npm run device

# Start device with breach simulation
cd backend && npm run device:breach

# Send single reading
cd backend && npm run device once

# Send burst of 50 readings
cd backend && npm run device:burst
```

---

## Project Structure

```
deploy-contract/
├── contracts/
│   ├── DeviceRegistry.sol
│   ├── DataAnchor.sol
│   └── BreachNFT.sol
├── scripts/
│   ├── deploy-group4.ts
│   └── register-device.ts
├── backend/
│   ├── server.js
│   ├── device-cli.js
│   ├── package.json
│   └── .env
├── .env
├── hardhat.config.ts
└── package.json
```

---

## Security Notes

- **Never commit `.env` files** to Git
- Keep private keys secure
- Use separate keys for development vs production
- Backend admin key has full control over contracts

---

## Support

For issues, check:
1. All `.env` files have correct values
2. IPFS is running
3. Contract addresses match deployment output
4. Device is registered on-chain
5. Admin account has enough ETH
