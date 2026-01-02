/**
 * Tank Level Control with RTD Temperature Monitoring
 * Generates .smbp file for Schneider M221 PLC (TM221CE40T)
 *
 * Node.js version of the Python generator
 */

const fs = require('fs');
const path = require('path');

const projectName = "Tank_Level_RTD_1m_TM221CE40T";

// Read the Python file to extract XML content
const pythonFilePath = path.join(__dirname, 'generate_tank_rtd_control.py');
const pythonContent = fs.readFileSync(pythonFilePath, 'utf8');

// Extract the XML content between the triple quotes
const xmlMatch = pythonContent.match(/xml_content = f'''([\s\S]*?)'''/);

if (xmlMatch && xmlMatch[1]) {
    let xmlContent = xmlMatch[1];

    // Replace the f-string variable with the actual project name
    xmlContent = xmlContent.replace(/\{project_name\}/g, projectName);

    // Output path
    const outputDir = path.join(__dirname, '..', 'plc_programs');
    const outputFile = path.join(outputDir, `${projectName}.smbp`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the file with UTF-8 BOM (required by Machine Expert Basic)
    const BOM = '\uFEFF';
    fs.writeFileSync(outputFile, BOM + xmlContent, 'utf8');

    console.log(`Generated: ${outputFile}`);
    console.log("\n=== Tank Level RTD Control Program ===");
    console.log("Controller: TM221CE40T (24 DI, 16 DO)");
    console.log("Expansion Module 1: TM3AI4/G (Level Transmitter 4-20mA)");
    console.log("Expansion Module 2: TM3TI4/G (RTD PT100 Temperature)");
    console.log("\n--- Specifications ---");
    console.log("Tank: 1m x 1m x 1m = 1000 liters");
    console.log("Level transmitter: 4-20mA, deadband 300mm, max range 5000mm");
    console.log("Transmitter installed 500mm above tank top");
    console.log("RTD: PT100 3-wire, -50 to 500 deg C range");
    console.log("\n--- HMI Tags ---");
    console.log("%MW10: HMI_TANK_LITERS - Tank volume in liters (0-1000)");
    console.log("%MW11: HMI_TEMPERATURE - Temperature in 0.1 deg C units");
    console.log("\n--- I/O Assignment ---");
    console.log("Inputs:");
    console.log("  %I0.0: START_FILL - Start Fill Button");
    console.log("  %I0.1: ESTOP - Emergency Stop (NC)");
    console.log("  %I0.2: INLET_VLV_FB - Inlet Valve Open Feedback");
    console.log("  %I0.3: INLET_VLV_CL_FB - Inlet Valve Closed Feedback");
    console.log("  %I0.4: OUTLET_VLV_FB - Outlet Valve Open Feedback");
    console.log("  %I0.5: OUTLET_VLV_CL_FB - Outlet Valve Closed Feedback");
    console.log("  %I0.6: ALARM_RESET - Alarm Reset Button");
    console.log("Outputs:");
    console.log("  %Q0.0: INLET_VALVE - Inlet Valve Solenoid");
    console.log("  %Q0.1: OUTLET_VALVE - Outlet Valve Solenoid");
    console.log("  %Q0.2: INLET_VLV_ALARM - Inlet Valve Failure Alarm");
    console.log("  %Q0.3: OUTLET_VLV_ALARM - Outlet Valve Failure Alarm");
    console.log("Analog Inputs:");
    console.log("  %IW1.0: LEVEL_XMTR - Level Transmitter 4-20mA (300-5000mm)");
    console.log("  %IW2.0: RTD_TEMP - PT100 Temperature (-50 to 500 deg C)");
    console.log("\n--- Process Sequence ---");
    console.log("1. Operator presses START_FILL button");
    console.log("2. Inlet valve opens, tank fills");
    console.log("3. When tank full (sensor <= 550mm), inlet valve closes");
    console.log("4. 10-second stabilization delay for RTD readings");
    console.log("5. Outlet valve opens automatically");
    console.log("6. When tank empty (sensor >= 1450mm), outlet valve closes");
    console.log("7. Valve failure alarms if no position feedback within 5 seconds");
    console.log("\nPLCAutoPilot v2.5 - Tank Level RTD Control with TM221CE40T");
} else {
    console.error("Could not extract XML content from Python file");
    process.exit(1);
}
