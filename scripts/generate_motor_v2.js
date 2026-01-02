/**
 * Motor Start/Stop with Overload Alarm - TM221CE16T
 * PLCAutoPilot v3.2 - Simple Copy and Modify Approach
 *
 * This script copies the template file and makes minimal changes
 * to preserve the exact XML structure.
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_StartStop_Overload_TM221CE16T.smbp';

// Read template as binary to preserve exact encoding
console.log("Reading template file...");
const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
let content = templateBuffer.toString('utf8');

// Simple string replacements (project name only)
console.log("Updating project name...");
content = content.split('Template for configuration of cards').join('Motor_StartStop_Overload_TM221CE16T');

// Write the file
console.log("Writing output file...");
fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

console.log("");
console.log("SUCCESS: File copied with project name updated");
console.log("Output: " + OUTPUT_PATH);
console.log("");
console.log("NOTE: This is a minimal modification - only project name changed.");
console.log("The template's rungs and configuration are preserved.");
console.log("");
console.log("To add motor control logic:");
console.log("1. Open the file in Machine Expert Basic");
console.log("2. Add the motor control rungs manually");
console.log("3. Or use the Claude API to generate the complete program");
