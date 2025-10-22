# CampusCreditV2 Airdrop Submission

---

## Token Deployment Details

- **TOKEN_ADDRESS:** `0x2e983a1ba5e8b38aaaec4b440b9ddcfbf72e15d1`
- **Deploy Block Number:** `2n`
- **Roles & Cap:**
  - Roles assigned on deploy:
    - `DEFAULT_ADMIN_ROLE`: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    - `MINTER_ROLE`: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    - `PAUSER_ROLE`: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  - Cap: `2000000` tokens
  - Initial Mint: `1000000` tokens

---

## MetaMask Custom Network & Token Screenshot

![MetaMask Custom Network and Token](https://github.com/jsb58p/blockchain-assignment3-biddinger/blob/main/screenshots/screenshot4(CAMP%20pretransfer).png)

![MetaMask Custom Network and Token](https://github.com/jsb58p/blockchain-assignment3-biddinger/blob/main/screenshots/screenshot5(CAMP%20posttransfer).png)

---

## Gas Usage Console Output from `airdrop.ts`

Airdrop: 0x684d17620bc826f09f7e6f9f4967704e68acc1eb725154b332019d4c7cd02d50 gasUsed: 40771 fee(wei): 102701837958041
Singles total gasUsed: 29199 fee(wei): 71662949689743
Batch saved ≈ -39.63% gas vs singles

![airdrop.ts](https://github.com/jsb58p/blockchain-assignment3-biddinger/blob/main/screenshots/screenshot2(npx%20hardhat%20run%20transfer-approve.ts%20and%20airdrop.ts).png)

## Gas Awareness Note

The `airdrop` function in the `CampusCreditV2` contract is designed with gas optimization techniques to minimize transaction costs.

- **Custom Errors:**
  Traditional Solidity `require` statements use string messages to indicate failure reasons (e.g., `require(condition, "Error message")`). These strings are stored in the contract bytecode and increase gas cost, especially when the error is triggered.
  By using **custom errors** like `error CapExceeded();` and `error ArrayLengthMismatch();`, the contract only stores an identifier (a selector) for the error instead of the full string. When the error is reverted, it returns this small selector instead of a long string. This reduces both deployment size and gas consumption during failure cases.

- **Unchecked Loops:**
  Solidity automatically inserts overflow checks on arithmetic operations like `i++` in loops, which costs additional gas. However, in this contract, the loops iterate over fixed array lengths (`to.length` and `amounts.length`), making overflow impossible within the loop bounds.
  Using `unchecked { ++i; }` disables the overflow check for increment operations, saving gas without compromising safety or correctness. This small change can add up significantly when looping over many recipients.

- **Calldata Arrays:** 
  The function parameters `address[] calldata to` and `uint256[] calldata amounts` are declared as `calldata`, meaning they are passed directly as read-only data from the transaction call without copying into memory.  
  Compared to `memory` arrays, accessing `calldata` is cheaper because it avoids duplicating data. This is especially beneficial when passing large arrays to batch functions like airdrops, where copying would be costly.

- **Single Transaction Amortization:** 
  Performing multiple token transfers or mints in a single batch transaction allows the fixed gas costs of transaction overhead (such as signature verification, transaction data processing, and event emission) to be spread across all recipients.
  If you were to send individual transactions for each recipient, you’d pay the fixed costs repeatedly, making the total gas usage and fees much higher. By bundling all mints in one transaction, the per-recipient cost decreases, leading to significant gas savings.

- **Cap Validation Before Minting:**
  The contract sums all the requested mint amounts and checks that the new total supply won’t exceed the predefined cap **before** minting any tokens.  
  This approach prevents partially completed airdrops where some tokens are minted before hitting the cap and reverting midway. Avoiding partial state changes saves gas and keeps the contract state consistent. It also avoids wasted gas on failed transactions that try to mint amounts exceeding the cap.

These optimizations demonstrate an approach to writing gas-aware smart contracts, making batch operations like airdrops both efficient and cost-effective.
