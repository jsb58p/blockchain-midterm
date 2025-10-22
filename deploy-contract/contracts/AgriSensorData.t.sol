// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgriSensorData} from "./AgriSensorData.sol";
import {Test} from "forge-std/Test.sol";

contract AgriSensorDataTest is Test {
    AgriSensorData public sensorContract;
    
    address admin = address(this);
    address device1 = address(0x1);
    address device2 = address(0x2);
    address farmer1 = address(0x3);
    address supplyChain1 = address(0x4);
    address unauthorized = address(0x5);
    
    bytes32 DEVICE_ROLE = keccak256("DEVICE_ROLE");
    bytes32 FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 SUPPLY_CHAIN_ROLE = keccak256("SUPPLY_CHAIN_ROLE");

    // Events to test
    event SensorDataSubmitted(
        uint256 indexed readingId,
        address indexed deviceId,
        uint256 indexed farmId,
        uint256 timestamp
    );

    event CropEventRecorded(
        uint256 indexed eventId,
        uint256 indexed farmId,
        string eventType,
        uint256 timestamp
    );

    event SupplyChainStageRecorded(
        uint256 indexed stageId,
        uint256 indexed productId,
        string stage,
        uint256 timestamp
    );

    event AnomalyDetected(
        uint256 indexed readingId,
        address indexed deviceId,
        string anomalyType
    );

    function setUp() public {
        // Deploy contract
        sensorContract = new AgriSensorData();
        
        // Grant roles
        sensorContract.grantRole(DEVICE_ROLE, device1);
        sensorContract.grantRole(DEVICE_ROLE, device2);
        sensorContract.grantRole(FARMER_ROLE, farmer1);
        sensorContract.grantRole(SUPPLY_CHAIN_ROLE, supplyChain1);
    }

    // ===== POSITIVE TESTS =====

    function test_SubmitValidSensorReading() public {
        vm.prank(device1);
        
        // Expect event to be emitted
        vm.expectEmit(true, true, true, false);
        emit SensorDataSubmitted(0, device1, 1, block.timestamp);
        
        sensorContract.submitSensorData(
            1,      // farmId
            255,    // temperature: 25.5°C
            452,    // soilMoisture: 45.2%
            605     // humidity: 60.5%
        );
        
        // Verify reading was stored
        (
            uint256 timestamp,
            address deviceId,
            uint256 farmId,
            int16 temperature,
            uint16 soilMoisture,
            uint16 humidity,
            bytes32 dataHash
        ) = sensorContract.readings(0);
        
        assertEq(deviceId, device1);
        assertEq(farmId, 1);
        assertEq(temperature, 255);
        assertEq(soilMoisture, 452);
        assertEq(humidity, 605);
        assertTrue(dataHash != bytes32(0));
        
        // Verify total readings increased
        assertEq(sensorContract.getTotalReadings(), 1);
    }

    function test_SubmitBatchReadings() public {
        vm.prank(device1);
        
        uint256[] memory farmIds = new uint256[](3);
        farmIds[0] = 1;
        farmIds[1] = 1;
        farmIds[2] = 2;
        
        int16[] memory temps = new int16[](3);
        temps[0] = 250;  // 25.0°C
        temps[1] = 260;  // 26.0°C
        temps[2] = 248;  // 24.8°C
        
        uint16[] memory moistures = new uint16[](3);
        moistures[0] = 450;
        moistures[1] = 460;
        moistures[2] = 445;
        
        uint16[] memory humidities = new uint16[](3);
        humidities[0] = 600;
        humidities[1] = 612;
        humidities[2] = 598;
        
        sensorContract.submitBatch(farmIds, temps, moistures, humidities);
        
        // Verify all readings were stored
        assertEq(sensorContract.getTotalReadings(), 3);
        
        // Check first reading
        (, address deviceId, uint256 farmId, int16 temp, , , ) = sensorContract.readings(0);
        assertEq(deviceId, device1);
        assertEq(farmId, 1);
        assertEq(temp, 250);
    }

    function test_RecordCropEvent() public {
        vm.prank(farmer1);
        
        vm.expectEmit(true, true, false, false);
        emit CropEventRecorded(0, 1, "SEED", block.timestamp);
        
        sensorContract.recordCropEvent(
            1,
            "SEED",
            "Planted tomatoes",
            bytes32(0)
        );
        
        assertEq(sensorContract.getTotalCropEvents(), 1);
        
        (uint256 farmId, string memory eventType, , string memory notes, ) = sensorContract.cropEvents(0);
        assertEq(farmId, 1);
        assertEq(eventType, "SEED");
        assertEq(notes, "Planted tomatoes");
    }

    function test_RecordSupplyChainStage() public {
        vm.prank(supplyChain1);
        
        vm.expectEmit(true, true, false, false);
        emit SupplyChainStageRecorded(0, 1001, "FARM", block.timestamp);
        
        sensorContract.recordSupplyChainStage(
            1001,
            "FARM",
            "Kansas Farm",
            bytes32(0)
        );
        
        assertEq(sensorContract.getTotalSupplyChainStages(), 1);
        
        (uint256 productId, string memory stage, , , string memory location, ) = sensorContract.supplyChainStages(0);
        assertEq(productId, 1001);
        assertEq(stage, "FARM");
        assertEq(location, "Kansas Farm");
    }

    function test_QueryReadingsByFarm() public {
        // Submit readings for different farms
        vm.startPrank(device1);
        sensorContract.submitSensorData(1, 250, 450, 600);
        sensorContract.submitSensorData(1, 260, 460, 610);
        sensorContract.submitSensorData(2, 240, 440, 590);
        vm.stopPrank();
        
        // Query farm 1
        uint256[] memory farm1Readings = sensorContract.getReadingsByFarm(1);
        assertEq(farm1Readings.length, 2);
        assertEq(farm1Readings[0], 0);
        assertEq(farm1Readings[1], 1);
        
        // Query farm 2
        uint256[] memory farm2Readings = sensorContract.getReadingsByFarm(2);
        assertEq(farm2Readings.length, 1);
        assertEq(farm2Readings[0], 2);
    }

    function test_NegativeTemperatureAllowed() public {
        vm.prank(device1);
        
        sensorContract.submitSensorData(
            1,
            -50,    // -5.0°C (winter temperature)
            400,
            500
        );
        
        (, , , int16 temp, , , ) = sensorContract.readings(0);
        assertEq(temp, -50);
    }

    // ===== NEGATIVE TESTS =====

    function test_RevertUnauthorizedDevice() public {
        vm.prank(unauthorized);
        
        vm.expectRevert();
        sensorContract.submitSensorData(1, 250, 450, 600);
    }

    function test_RevertInvalidSoilMoisture() public {
        vm.prank(device1);
        
        vm.expectRevert(AgriSensorData.InvalidSensorData.selector);
        sensorContract.submitSensorData(
            1,
            250,
            1001,   // exceeds 1000 (100%)
            600
        );
    }

    function test_RevertInvalidHumidity() public {
        vm.prank(device1);
        
        vm.expectRevert(AgriSensorData.InvalidSensorData.selector);
        sensorContract.submitSensorData(
            1,
            250,
            450,
            1500    // exceeds 1000 (100%)
        );
    }

    function test_RevertBatchArrayLengthMismatch() public {
        vm.prank(device1);
        
        uint256[] memory farmIds = new uint256[](2);
        farmIds[0] = 1;
        farmIds[1] = 2;
        
        int16[] memory temps = new int16[](3);  // Wrong length!
        temps[0] = 250;
        temps[1] = 260;
        temps[2] = 270;
        
        uint16[] memory moistures = new uint16[](2);
        moistures[0] = 450;
        moistures[1] = 460;
        
        uint16[] memory humidities = new uint16[](2);
        humidities[0] = 600;
        humidities[1] = 610;
        
        vm.expectRevert(AgriSensorData.ArrayLengthMismatch.selector);
        sensorContract.submitBatch(farmIds, temps, moistures, humidities);
    }

    function test_RevertDuplicateDataHash() public {
        vm.startPrank(device1);
        
        // Submit first reading
        sensorContract.submitSensorData(1, 250, 450, 600);
        
        // Try to submit identical reading in same block (same timestamp)
        vm.expectRevert(AgriSensorData.DuplicateDataHash.selector);
        sensorContract.submitSensorData(1, 250, 450, 600);
        
        vm.stopPrank();
    }

    function test_RevertUnauthorizedFarmer() public {
        vm.prank(unauthorized);
        
        vm.expectRevert();
        sensorContract.recordCropEvent(1, "SEED", "Test", bytes32(0));
    }

    function test_RevertUnauthorizedSupplyChain() public {
        vm.prank(unauthorized);
        
        vm.expectRevert();
        sensorContract.recordSupplyChainStage(1001, "FARM", "Test", bytes32(0));
    }

    // ===== EVENT TESTS =====

    function test_EventEmittedOnSensorSubmit() public {
        vm.prank(device1);
        
        // Expect exact event
        vm.expectEmit(true, true, true, true);
        emit SensorDataSubmitted(0, device1, 1, block.timestamp);
        
        sensorContract.submitSensorData(1, 250, 450, 600);
    }

    function test_AnomalyDetectedForExtremeTemperature() public {
        vm.prank(device1);
        
        // Expect anomaly event for extreme temperature
        vm.expectEmit(true, true, false, true);
        emit AnomalyDetected(0, device1, "EXTREME_TEMPERATURE");
        
        sensorContract.submitSensorData(
            1,
            700,    // 70°C - extreme!
            450,
            600
        );
    }

    function test_AnomalyDetectedForExtremeMoisture() public {
        vm.prank(device1);
        
        vm.expectEmit(true, true, false, true);
        emit AnomalyDetected(0, device1, "EXTREME_SOIL_MOISTURE");
        
        sensorContract.submitSensorData(
            1,
            250,
            20,     // 2% - very dry!
            600
        );
    }

    function test_MultipleEventsInBatch() public {
        vm.prank(device1);
        
        uint256[] memory farmIds = new uint256[](2);
        farmIds[0] = 1;
        farmIds[1] = 2;
        
        int16[] memory temps = new int16[](2);
        temps[0] = 250;
        temps[1] = 260;
        
        uint16[] memory moistures = new uint16[](2);
        moistures[0] = 450;
        moistures[1] = 460;
        
        uint16[] memory humidities = new uint16[](2);
        humidities[0] = 600;
        humidities[1] = 610;
        
        // Expect 2 events
        vm.expectEmit(true, true, true, false);
        emit SensorDataSubmitted(0, device1, 1, block.timestamp);
        
        vm.expectEmit(true, true, true, false);
        emit SensorDataSubmitted(1, device1, 2, block.timestamp);
        
        sensorContract.submitBatch(farmIds, temps, moistures, humidities);
    }

    // ===== ROLE MANAGEMENT TESTS =====

    function test_AdminCanGrantRole() public {
        address newDevice = address(0x99);
        
        sensorContract.grantRole(DEVICE_ROLE, newDevice);
        
        assertTrue(sensorContract.hasRole(DEVICE_ROLE, newDevice));
    }

    function test_AdminCanRevokeRole() public {
        sensorContract.revokeRole(DEVICE_ROLE, device1);
        
        assertFalse(sensorContract.hasRole(DEVICE_ROLE, device1));
        
        // Verify device1 can no longer submit
        vm.prank(device1);
        vm.expectRevert();
        sensorContract.submitSensorData(1, 250, 450, 600);
    }

    function test_NonAdminCannotGrantRole() public {
        vm.prank(unauthorized);
        
        vm.expectRevert();
        sensorContract.grantRole(DEVICE_ROLE, unauthorized);
    }
}