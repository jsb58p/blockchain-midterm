# SensorSeal Frontend Quick Start

## Setup

# Starting the Webpage

- Have MetaMask installed

Navigate to the directory with index.html:
```bash
cd /path/to/your/index.html
```

Start the web server:
```bash
python3 -m http.server 8000
```

Open in browser:
```
http://localhost:8000/index.html
```
## Steps to Use

### 1. Connect Wallet
- Click "1) Connect Wallet & Switch Network"
- Approve MetaMask prompts

### 2. Load Contracts
- Enter your 3 contract addresses (DeviceRegistry, DataAnchor, BreachNFT)
- Set Backend API URL (default: `http://localhost:3000`)
- Click "2) Load Contracts"

### 3. Register a Device
- Go to "Register Device" tab
- Enter device address (generate with: `node -e "const {privateKeyToAccount} = require('viem/accounts'); const pk='0x[PRIVATE_KEY]'; console.log(privateKeyToAccount(pk).address)"`)
- Enter owner address (your wallet)
- Click "Register Device"

### 4. View Data
- **Devices tab**: See registered devices
- **Batch History tab**: View committed sensor batches, verify integrity
- **Breaches tab**: See breach NFTs
- **Live Queue tab**: Monitor backend status

## Notes
- Must use wallet that deployed contracts (has admin role)
- Each device can only be registered once
- Backend must be running on specified API URL
