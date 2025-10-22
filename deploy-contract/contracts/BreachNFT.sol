// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BreachNFT
 * @dev NFT minted when cold chain breaches are detected.
 * Features:
 * - ERC721 token for each breach incident
 * - Links to device, product, and batch data
 * - IPFS metadata with breach details
 * - Query functions for breach analysis
 * - Integration with Group 1 product passports
 */
contract BreachNFT is ERC721URIStorage, AccessControl {
    // Custom errors
    error InvalidAddress();
    error InvalidTokenURI();
    error BreachNotFound();

    // Breach metadata structure
    struct BreachInfo {
        uint256 tokenId;
        address device;
        uint256 traceTokenId;    // Link to Group 1 product passport
        uint256 batchId;         // Link to DataAnchor batch
        uint256 timestamp;
        string breachType;       // e.g., "TEMP_HIGH", "TEMP_LOW", "HUMIDITY_HIGH"
        string metadataURI;      // IPFS URI with full breach report
    }

    // Storage
    uint256 public nextId;
    mapping(uint256 => BreachInfo) public breaches;
    
    mapping(address => uint256[]) public deviceToBreaches;      // Device => Breach token IDs
    mapping(uint256 => uint256[]) public productToBreaches;     // Product => Breach token IDs
    mapping(uint256 => uint256) public batchToBreachToken;      // Batch => Breach token ID

    // Events
    event BreachMinted(
        uint256 indexed tokenId,
        address indexed device,
        uint256 indexed traceTokenId,
        uint256 batchId,
        string breachType,
        uint256 timestamp
    );

    event BreachResolved(
        uint256 indexed tokenId,
        address resolver,
        uint256 timestamp
    );

    /**
     * @dev Constructor sets name, symbol, and grants admin role
     */
    constructor() ERC721("BreachNFT", "BRCH") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Mint a breach NFT
     * @param to Recipient address (typically the product owner or system)
     * @param device Device that detected the breach
     * @param traceTokenId Link to Group 1 product passport
     * @param batchId Link to DataAnchor batch
     * @param breachType Type of breach detected
     * @param metadataURI IPFS URI containing full breach report
     */
    function mint(
        address to,
        address device,
        uint256 traceTokenId,
        uint256 batchId,
        string calldata breachType,
        string calldata metadataURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        if (to == address(0) || device == address(0)) revert InvalidAddress();
        if (bytes(metadataURI).length == 0) revert InvalidTokenURI();

        uint256 tokenId = ++nextId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        BreachInfo memory info = BreachInfo({
            tokenId: tokenId,
            device: device,
            traceTokenId: traceTokenId,
            batchId: batchId,
            timestamp: block.timestamp,
            breachType: breachType,
            metadataURI: metadataURI
        });

        breaches[tokenId] = info;
        deviceToBreaches[device].push(tokenId);
        productToBreaches[traceTokenId].push(tokenId);
        batchToBreachToken[batchId] = tokenId;

        emit BreachMinted(
            tokenId,
            device,
            traceTokenId,
            batchId,
            breachType,
            block.timestamp
        );

        return tokenId;
    }

    /**
     * @dev Get breach information
     * @param tokenId The breach NFT token ID
     * @return BreachInfo struct
     */
    function getBreachInfo(uint256 tokenId) external view returns (BreachInfo memory) {
        if (breaches[tokenId].tokenId == 0) revert BreachNotFound();
        return breaches[tokenId];
    }

    /**
     * @dev Get all breach token IDs for a device
     * @param device The device address
     * @return Array of breach token IDs
     */
    function getBreachesByDevice(address device) external view returns (uint256[] memory) {
        return deviceToBreaches[device];
    }

    /**
     * @dev Get all breach token IDs for a product
     * @param traceTokenId The product passport token ID
     * @return Array of breach token IDs
     */
    function getBreachesByProduct(uint256 traceTokenId) external view returns (uint256[] memory) {
        return productToBreaches[traceTokenId];
    }

    /**
     * @dev Check if a batch has an associated breach
     * @param batchId The DataAnchor batch ID
     * @return hasBreaches Whether a breach exists
     * @return tokenId The breach token ID if exists
     */
    function getBatchBreach(uint256 batchId) 
        external 
        view 
        returns (bool hasBreaches, uint256 tokenId) 
    {
        tokenId = batchToBreachToken[batchId];
        hasBreaches = tokenId != 0;
    }

    /**
     * @dev Get total number of breaches minted
     */
    function getTotalBreaches() external view returns (uint256) {
        return nextId;
    }

    /**
     * @dev Check if a product has any breaches
     * @param traceTokenId The product passport token ID
     */
    function hasProductBreaches(uint256 traceTokenId) external view returns (bool) {
        return productToBreaches[traceTokenId].length > 0;
    }

    /**
     * @dev Get breach count for a device
     * @param device The device address
     */
    function getDeviceBreachCount(address device) external view returns (uint256) {
        return deviceToBreaches[device].length;
    }

    /**
     * @dev Get breach count for a product
     * @param traceTokenId The product passport token ID
     */
    function getProductBreachCount(uint256 traceTokenId) external view returns (uint256) {
        return productToBreaches[traceTokenId].length;
    }

    /**
     * @dev Get recent breaches (last N)
     * @param count Number of recent breaches to return
     * @return Array of breach token IDs (newest first)
     */
    function getRecentBreaches(uint256 count) external view returns (uint256[] memory) {
        uint256 total = nextId;
        if (count > total) count = total;
        if (count == 0) return new uint256[](0);

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = total - i;
        }
        return result;
    }

    /**
     * @dev Emit a resolution event (for tracking, doesn't burn token)
     * @param tokenId The breach token ID being resolved
     */
    function markResolved(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (breaches[tokenId].tokenId == 0) revert BreachNotFound();
        
        emit BreachResolved(tokenId, msg.sender, block.timestamp);
    }

    /**
     * @dev Required override for AccessControl + ERC721
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}