/**
 * Tank Level Control Generator
 * Uses smbp-templates.ts to generate valid .smbp file
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateCompareBlockRung,
  generateHysteresisRung,
  generateSimpleRung,
  generateFullSmbp,
  RungPattern
} from '../lib/smbp-templates';

// Tank Level Control Configuration
const config = {
  projectName: 'Tank_Level_Control',
  plcModel: 'TM221CE16T' as const,

  // Analog thresholds (ultrasonic sensor: low value = full, high value = empty)
  fullThreshold: 1800,   // Tank full when sensor < 1800
  emptyThreshold: 4800,  // Tank empty when sensor > 4800
};

// Generate rungs using templates
const rungs: RungPattern[] = [];

// Rung 1: Tank Full Detection (CompareBlock)
rungs.push(generateCompareBlockRung({
  analogInput: '%IW1.0',
  operator: '<',
  value: config.fullThreshold,
  output: '%M0',
  outputSymbol: 'TANK_FULL',
  rungName: 'Tank Full Detection',
  rungComment: 'Set flag when ultrasonic reads low (tank full)'
}));

// Rung 2: Tank Empty Detection (CompareBlock)
rungs.push(generateCompareBlockRung({
  analogInput: '%IW1.0',
  operator: '>',
  value: config.emptyThreshold,
  output: '%M1',
  outputSymbol: 'TANK_EMPTY',
  rungName: 'Tank Empty Detection',
  rungComment: 'Set flag when ultrasonic reads high (tank empty)'
}));

// Rung 3: Inlet Valve Control (Hysteresis - fill when empty, stop when full)
rungs.push(generateHysteresisRung({
  lowFlag: '%M1',
  lowSymbol: 'TANK_EMPTY',
  highFlag: '%M0',
  highSymbol: 'TANK_FULL',
  output: '%Q0.0',
  outputSymbol: 'INLET_VLV',
  rungName: 'Inlet Valve Control',
  rungComment: 'Fill tank when empty, seal-in until full'
}));

// Rung 4: Outlet Valve Control (Hysteresis - drain when full, stop when empty)
rungs.push(generateHysteresisRung({
  lowFlag: '%M0',
  lowSymbol: 'TANK_FULL',
  highFlag: '%M1',
  highSymbol: 'TANK_EMPTY',
  output: '%Q0.1',
  outputSymbol: 'OUTLET_VLV',
  rungName: 'Outlet Valve Control',
  rungComment: 'Drain tank when full, seal-in until empty'
}));

// Generate full SMBP file with TM3AI4 expansion module
const smbpContent = generateFullSmbp({
  projectName: config.projectName,
  plcModel: config.plcModel,
  rungs: rungs,
  outputs: [
    { address: '%Q0.0', symbol: 'INLET_VLV' },
    { address: '%Q0.1', symbol: 'OUTLET_VLV' }
  ],
  memoryBits: [
    { address: '%M0', symbol: 'TANK_FULL', comment: 'Tank full flag from ultrasonic' },
    { address: '%M1', symbol: 'TANK_EMPTY', comment: 'Tank empty flag from ultrasonic' }
  ],
  tm3ai4: {
    channels: [
      {
        address: '%IW1.0',
        symbol: 'LEVEL_AIN',
        comment: 'Ultrasonic level transmitter 4-20mA',
        aiType: 'Current4_20mA'
      }
    ]
  }
});

// Write to file
const outputPath = path.join(__dirname, '..', 'plc_programs', 'tank_level_v3_TM221CE16T.smbp');
fs.writeFileSync(outputPath, smbpContent, 'utf8');

console.log(`Generated: ${outputPath}`);
console.log(`Project: ${config.projectName}`);
console.log(`PLC Model: ${config.plcModel}`);
console.log(`Rungs: ${rungs.length}`);
