# Assignment 3 ERC-20 Token

## Configuration
- RPC URL: https://eth.didlab.org
- Chain ID: 252501
- Token Address: 0x71550ac84ba7599220eaef5c756b847cb4486606
- Run the provided scripts with your '.env' configuration.

## Running Scripts

### Environment must use:
- Node.js: v22.x (even-major LTS).
- Hardhat: v3 (ESM project).
- Client libs: Viem (for wallet/public client).
- Contracts lib: OpenZeppelin v5.
- Do not install: hardhat-gas-reporter (incompatible with HH v3).  
1. Copy `.env.example` to `.env` and fill in your keys.    
2. Run scripts using Hardhat.  
3. Example commands:  
   - `npx hardhat run scripts/deploy.ts --network didlab`  
   - `npx hardhat run scripts/logs-query.ts --network didlab`  

### Deploy
```
Deploying CampusCreditV2…
Deploy tx: 0xdb127ab2618134Secaefba14e217e84c62ea0df6523f865e3d86cfed32a9878f
b5e75a47b38eb9f37b
Deployed at: 0x71550ac84ba7599220eaef5c756b847cb4486606
Block: 249597n

Add this to .env:
TOKEN_ADDRESS=${rcpt.contractAddress}
```
## Screenshots
<br> 

![deploy](https://github.com/ehdkq/Blockchain-Main-Project/blob/main/Project%20Screenshots/deploy252501.png)

<br>

![dapp](https://github.com/ehdkq/Blockchain-Main-Project/blob/main/Project%20Screenshots/dapp-success.png)

<br>

![block explorer](https://github.com/ehdkq/Blockchain-Main-Project/blob/main/Project%20Screenshots/contractcreation.png)
# Project Short Write-up

## a. Where you enforced: cap, pause, roles
- **Cap enforcement:**  
  In `CampusCreditV2.sol`, minting is capped using OpenZeppelin’s `ERC20Capped`.  
  The `airdrop()` function calculates the total of all mint amounts and reverts with the
  custom error `CapExceeded` if the new total supply would exceed the cap.
- **Pause enforcement:**  
  The contract inherits `ERC20Pausable`.  
  Functions `pause()` and `unpause()` can only be called by accounts with the
  `PAUSER_ROLE` to halt or resume all token transfers.
- **Role enforcement:**  
  Using `AccessControl`, the contract defines:
  - `DEFAULT_ADMIN_ROLE` for role management,
  - `MINTER_ROLE` required by `mint()` and `airdrop()`,
  - `PAUSER_ROLE` required by `pause()`/`unpause()`.  
  The `onlyRole` modifier ensures that only authorized accounts can call these functions.
```

<br>


<br><br><br><br><br>


# Sample Hardhat 3 Beta Project (`node:test` and `viem`)

This project showcases a Hardhat 3 Beta project using the native Node.js test runner (`node:test`) and the `viem` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
