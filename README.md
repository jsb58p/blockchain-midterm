## System Flow Diagram

┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: SETUP                              │
└─────────────────────────────────────────────────────────────────────┘

     Admin                    Blockchain                   Contracts
       │                          │                            │
       │  1. Deploy contracts     │                            │
       ├─────────────────────────>│                            │
       │                          │  Create DeviceRegistry ───>│
       │                          │  Create DataAnchor ───────>│
       │                          │  Create BreachNFT ────────>│
       │                          │                            │
       │  2. Register device      │                            │
       ├─────────────────────────>│  addDevice() ─────────────>│
       │                          │                            │
       │                          │<─── Device now active ─────│
       │                          │                            │


┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: REAL-TIME OPERATION                     │
└─────────────────────────────────────────────────────────────────────┘

  IoT Device              Backend Server           Blockchain/IPFS
      │                         │                         │
      │ 1. Generate reading     │                         │
      │    (temp, humidity)     │                         │
      │                         │                         │
      │ 2. Sign with private    │                         │
      │    key (ECDSA)          │                         │
      │                         │                         │
      │ 3. POST /ingest        │                         │
      ├────────────────────────>│                         │
      │                         │                         │
      │                         │ 4. Verify signature     │
      │                         │    (recover address)    │
      │                         │                         │
      │                         │ 5. Check device active  │
      │                         ├────────────────────────>│
      │                         │<─── isDeviceActive() ───│
      │                         │                         │
      │                         │ 6. Add to queue         │
      │                         │    (in-memory)          │
      │                         │                         │
      │<─── 200 OK ─────────────│                         │
      │                         │                         │
      │ (60 seconds pass...)    │                         │
      │                         │                         │
      │                         │ 7. Create batch JSON    │
      │                         │    {device, readings[]} │
      │                         │                         │
      │                         │ 8. Pin to IPFS         │
      │                         ├────────────────────────>│
      │                         │<─── CID: QmXyZ789... ───│
      │                         │                         │
      │                         │ 9. Hash CID            │
      │                         │    keccak256(CID)      │
      │                         │                         │
      │                         │ 10. commitBatch()      │
      │                         ├────────────────────────>│
      │                         │    (cidHash, window)    │
      │                         │                         │
      │                         │<─── Batch ID ───────────│
      │                         │                         │
      │                         │ 11. Check for breaches  │
      │                         │     (temp < 2 or > 8)  │
      │                         │                         │
      │                         │ 12. IF BREACH:          │
      │                         │     - Create report     │
      │                         │     - Pin to IPFS      │
      │                         ├────────────────────────>│
      │                         │<─── Report CID ──────────│
      │                         │                         │
      │                         │ 13. mint(BreachNFT)    │
      │                         ├────────────────────────>│
      │                         │<─── NFT Token ID ────────│
      │                         │                         │


┌─────────────────────────────────────────────────────────────────────┐
│                      DATA VERIFICATION FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

    Auditor/Consumer         Blockchain              IPFS
         │                       │                    │
         │ 1. Query product      │                    │
         │    breaches           │                    │
         ├──────────────────────>│                    │
         │                       │                    │
         │<─ BreachNFT IDs ──────│                    │
         │   [1, 5, 12]          │                    │
         │                       │                    │
         │ 2. Get breach info    │                    │
         ├──────────────────────>│                    │
         │                       │                    │
         │<─ {device, batchId,   │                    │
         │    metadataURI} ──────│                    │
         │                       │                    │
         │ 3. Fetch metadata     │                    │
         ├───────────────────────┼───────────────────>│
         │                       │                    │
         │<─ Breach report ──────┼────────────────────│
         │   {timestamp, temp,   │                    │
         │    reading, batchCID} │                    │
         │                       │                    │
         │ 4. Get batch data     │                    │
         ├──────────────────────>│                    │
         │<─ Batch commitment ───│                    │
         │   {cidHash, window}   │                    │
         │                       │                    │
         │ 5. Fetch full batch   │                    │
         ├───────────────────────┼───────────────────>│
         │                       │                    │
         │<─ Batch data ─────────┼────────────────────│
         │   {readings[60]}      │                    │
         │                       │                    │
         │ 6. Verify:            │                    │
         │    - Hash matches     │                    │
         │    - Signatures valid │                    │
         │    - Timestamps match │                    │
         │                       │                    │
