// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DataAnchor
 * @dev On-chain anchor for IPFS batch commitments with role-based access control.
 * Features:
 * - Store batch commitments (IPFS hash + time window)
 * - Permanent audit trail of sensor data batches
 * - Query functions for batch history
 * - Verification support for hash validation
 */
contract DataAnchor is AccessControl {
    // Custom errors
    error InvalidTimeWindow();
    error InvalidCIDHash();
    error InvalidDevice();
    error BatchNotFound();

    // Batch commitment structure
    struct BatchCommitment {
        address device;
        bytes32 cidHash;         // keccak256 of IPFS CID
        uint64 windowStart;
        uint64 windowEnd;
        uint256 timestamp;       // Block timestamp when committed
        uint256 blockNumber;     // Block number for verification
    }

    // Storage
    BatchCommitment[] public batches;
    
    mapping(address => uint256[]) public deviceToBatches;    // Device => Batch indices
    mapping(bytes32 => uint256) public cidHashToBatch;       // CID hash => Batch index (for lookup)
    mapping(bytes32 => bool) public committedHashes;         // Track committed hashes

    // Events
    event BatchCommitted(
        uint256 indexed batchId,
        address indexed device,
        bytes32 cidHash,
        uint64 windowStart,
        uint64 windowEnd,
        uint256 timestamp,
        uint256 blockNumber
    );

    /**
     * @dev Constructor grants admin role to deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Commit a batch of sensor readings to the blockchain
     * @param device The device address that generated the readings
     * @param cidHash keccak256 hash of the IPFS CID
     * @param windowStart Start timestamp of the batch window
     * @param windowEnd End timestamp of the batch window
     */
    function commitBatch(
        address device,
        bytes32 cidHash,
        uint64 windowStart,
        uint64 windowEnd
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        if (device == address(0)) revert InvalidDevice();
        if (cidHash == bytes32(0)) revert InvalidCIDHash();
        if (windowEnd <= windowStart) revert InvalidTimeWindow();

        uint256 batchId = batches.length;

        BatchCommitment memory commitment = BatchCommitment({
            device: device,
            cidHash: cidHash,
            windowStart: windowStart,
            windowEnd: windowEnd,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        batches.push(commitment);
        deviceToBatches[device].push(batchId);
        cidHashToBatch[cidHash] = batchId;
        committedHashes[cidHash] = true;

        emit BatchCommitted(
            batchId,
            device,
            cidHash,
            windowStart,
            windowEnd,
            block.timestamp,
            block.number
        );

        return batchId;
    }

    /**
     * @dev Get batch commitment by ID
     * @param batchId The batch index
     * @return BatchCommitment struct
     */
    function getBatch(uint256 batchId) external view returns (BatchCommitment memory) {
        if (batchId >= batches.length) revert BatchNotFound();
        return batches[batchId];
    }

    /**
     * @dev Get all batch IDs for a device
     * @param device The device address
     * @return Array of batch indices
     */
    function getBatchesByDevice(address device) external view returns (uint256[] memory) {
        return deviceToBatches[device];
    }

    /**
     * @dev Verify if a CID hash has been committed
     * @param cidHash The keccak256 hash of the IPFS CID
     * @return committed Whether the hash exists on-chain
     * @return batchId The batch ID if found
     */
    function verifyCIDHash(bytes32 cidHash) external view returns (bool committed, uint256 batchId) {
        committed = committedHashes[cidHash];
        if (committed) {
            batchId = cidHashToBatch[cidHash];
        }
    }

    /**
     * @dev Get total number of committed batches
     */
    function getTotalBatches() external view returns (uint256) {
        return batches.length;
    }

    /**
     * @dev Get batches in a time range
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return Array of batch IDs that overlap with the time range
     */
    function getBatchesByTimeRange(
        uint64 startTime,
        uint64 endTime
    ) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count matching batches
        for (uint256 i = 0; i < batches.length; i++) {
            BatchCommitment memory batch = batches[i];
            // Check if batch window overlaps with query range
            if (batch.windowStart <= endTime && batch.windowEnd >= startTime) {
                count++;
            }
        }

        // Second pass: collect matching batch IDs
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < batches.length; i++) {
            BatchCommitment memory batch = batches[i];
            if (batch.windowStart <= endTime && batch.windowEnd >= startTime) {
                result[index] = i;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get the latest batch for a device
     * @param device The device address
     * @return batchId The latest batch ID
     * @return commitment The latest batch commitment
     */
    function getLatestBatch(address device) 
        external 
        view 
        returns (uint256 batchId, BatchCommitment memory commitment) 
    {
        uint256[] memory deviceBatches = deviceToBatches[device];
        if (deviceBatches.length == 0) revert BatchNotFound();
        
        batchId = deviceBatches[deviceBatches.length - 1];
        commitment = batches[batchId];
    }

    /**
     * @dev Get batch count for a device
     * @param device The device address
     */
    function getDeviceBatchCount(address device) external view returns (uint256) {
        return deviceToBatches[device].length;
    }
}