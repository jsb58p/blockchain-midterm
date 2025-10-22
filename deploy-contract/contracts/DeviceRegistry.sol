// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DeviceRegistry
 * @dev Registry for IoT devices with IPFS metadata storage and role-based access control.
 * Features:
 * - Device registration with public key and metadata
 * - Owner tracking for each device
 * - Link to Group 1 product passports (traceTokenId)
 * - IPFS-based metadata storage (off-chain details)
 * - Query functions for device information
 */
contract DeviceRegistry is AccessControl {
    // Custom errors
    error DeviceAlreadyRegistered();
    error DeviceNotFound();
    error InvalidAddress();
    error EmptyMetadataCID();

    // Device metadata structure
    struct DeviceInfo {
        address deviceAddress;
        address owner;
        string metadataCID;      // IPFS CID containing: make, model, pubkey, etc.
        uint256 traceTokenId;    // Link to Group 1 product passport
        uint256 registeredAt;
        bool active;
    }

    // Storage
    mapping(address => DeviceInfo) public devices;
    mapping(address => bool) public isRegistered;
    address[] public deviceList;
    
    mapping(uint256 => address[]) public traceTokenToDevices;  // Product => Devices monitoring it
    mapping(address => uint256[]) public ownerToDevices;       // Owner => Device indices

    // Events
    event DeviceAdded(
        address indexed deviceAddress,
        address indexed owner,
        string metadataCID,
        uint256 traceTokenId,
        uint256 timestamp
    );

    event DeviceDeactivated(
        address indexed deviceAddress,
        uint256 timestamp
    );

    event DeviceReactivated(
        address indexed deviceAddress,
        uint256 timestamp
    );

    event MetadataUpdated(
        address indexed deviceAddress,
        string newMetadataCID,
        uint256 timestamp
    );

    /**
     * @dev Constructor grants admin role to deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new device
     * @param deviceAddress The device's blockchain address (derived from public key)
     * @param owner The owner's address (can manage the device)
     * @param metadataCID IPFS CID containing device metadata JSON
     * @param traceTokenId Link to Group 1 product passport NFT
     */
    function addDevice(
        address deviceAddress,
        address owner,
        string calldata metadataCID,
        uint256 traceTokenId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (deviceAddress == address(0) || owner == address(0)) revert InvalidAddress();
        if (isRegistered[deviceAddress]) revert DeviceAlreadyRegistered();
        if (bytes(metadataCID).length == 0) revert EmptyMetadataCID();

        DeviceInfo memory info = DeviceInfo({
            deviceAddress: deviceAddress,
            owner: owner,
            metadataCID: metadataCID,
            traceTokenId: traceTokenId,
            registeredAt: block.timestamp,
            active: true
        });

        devices[deviceAddress] = info;
        isRegistered[deviceAddress] = true;
        deviceList.push(deviceAddress);
        
        traceTokenToDevices[traceTokenId].push(deviceAddress);
        ownerToDevices[owner].push(deviceList.length - 1);

        emit DeviceAdded(deviceAddress, owner, metadataCID, traceTokenId, block.timestamp);
    }

    /**
     * @dev Update device metadata CID
     * @param deviceAddress The device address
     * @param newMetadataCID New IPFS CID
     */
    function updateMetadata(
        address deviceAddress,
        string calldata newMetadataCID
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!isRegistered[deviceAddress]) revert DeviceNotFound();
        if (bytes(newMetadataCID).length == 0) revert EmptyMetadataCID();

        devices[deviceAddress].metadataCID = newMetadataCID;

        emit MetadataUpdated(deviceAddress, newMetadataCID, block.timestamp);
    }

    /**
     * @dev Deactivate a device (stops accepting readings)
     * @param deviceAddress The device address
     */
    function deactivateDevice(address deviceAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!isRegistered[deviceAddress]) revert DeviceNotFound();

        devices[deviceAddress].active = false;

        emit DeviceDeactivated(deviceAddress, block.timestamp);
    }

    /**
     * @dev Reactivate a device
     * @param deviceAddress The device address
     */
    function reactivateDevice(address deviceAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!isRegistered[deviceAddress]) revert DeviceNotFound();

        devices[deviceAddress].active = true;

        emit DeviceReactivated(deviceAddress, block.timestamp);
    }

    /**
     * @dev Get device information
     * @param deviceAddress The device address
     * @return DeviceInfo struct
     */
    function getDevice(address deviceAddress) external view returns (DeviceInfo memory) {
        if (!isRegistered[deviceAddress]) revert DeviceNotFound();
        return devices[deviceAddress];
    }

    /**
     * @dev Get all devices monitoring a specific product
     * @param traceTokenId The product passport token ID
     * @return Array of device addresses
     */
    function getDevicesByProduct(uint256 traceTokenId) external view returns (address[] memory) {
        return traceTokenToDevices[traceTokenId];
    }

    /**
     * @dev Get all device indices owned by an address
     * @param owner The owner address
     * @return Array of indices in deviceList
     */
    function getDevicesByOwner(address owner) external view returns (uint256[] memory) {
        return ownerToDevices[owner];
    }

    /**
     * @dev Get total number of registered devices
     */
    function getTotalDevices() external view returns (uint256) {
        return deviceList.length;
    }

    /**
     * @dev Get device address by index
     * @param index Index in deviceList
     */
    function getDeviceByIndex(uint256 index) external view returns (address) {
        return deviceList[index];
    }

    /**
     * @dev Check if device is active and registered
     * @param deviceAddress The device address
     */
    function isDeviceActive(address deviceAddress) external view returns (bool) {
        return isRegistered[deviceAddress] && devices[deviceAddress].active;
    }

    /**
     * @dev Get device metadata CID (convenience function)
     * @param deviceAddress The device address
     */
    function getMetadataCID(address deviceAddress) external view returns (string memory) {
        if (!isRegistered[deviceAddress]) revert DeviceNotFound();
        return devices[deviceAddress].metadataCID;
    }
}