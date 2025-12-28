/**
 * Re-export PLC models database from app/data
 * This file provides the @/lib/plc-models-database import path
 */

export {
  plcModels,
  plcManufacturers,
  getManufacturers,
  getModelsByManufacturer,
  searchModels,
  getModelById,
} from '@/app/data/plc-models';

export type { PLCModel as PLCModelFlat } from '@/app/data/plc-models';

// Hierarchical types for cascading selector
export interface PLCModel {
  id: string;
  name: string;
  partNumber?: string;
  specifications?: Record<string, string>;
}

export interface PLCSeries {
  id: string;
  name: string;
  description: string;
  software: string;
  models: PLCModel[];
}

export interface PLCManufacturer {
  id: string;
  name: string;
  series: PLCSeries[];
}

// Hierarchical database for cascading selector
const plcManufacturersHierarchy: PLCManufacturer[] = [
  {
    id: 'schneider',
    name: 'Schneider Electric',
    series: [
      {
        id: 'm221',
        name: 'Modicon M221',
        description: 'Compact logic controller for simple machines',
        software: 'Machine Expert Basic (SoMachine Basic)',
        models: [
          { id: 'tm221ce16r', name: 'TM221CE16R', partNumber: 'TM221CE16R', specifications: { 'Digital I/O': '9 DI / 7 DO', 'Output Type': 'Relay', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce16t', name: 'TM221CE16T', partNumber: 'TM221CE16T', specifications: { 'Digital I/O': '9 DI / 7 DO', 'Output Type': 'Transistor Sink', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce16u', name: 'TM221CE16U', partNumber: 'TM221CE16U', specifications: { 'Digital I/O': '9 DI / 7 DO', 'Output Type': 'Transistor Source', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce24r', name: 'TM221CE24R', partNumber: 'TM221CE24R', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Output Type': 'Relay', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce24t', name: 'TM221CE24T', partNumber: 'TM221CE24T', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Output Type': 'Transistor Sink', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce24u', name: 'TM221CE24U', partNumber: 'TM221CE24U', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Output Type': 'Transistor Source', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce40r', name: 'TM221CE40R', partNumber: 'TM221CE40R', specifications: { 'Digital I/O': '24 DI / 16 DO', 'Output Type': 'Relay', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce40t', name: 'TM221CE40T', partNumber: 'TM221CE40T', specifications: { 'Digital I/O': '24 DI / 16 DO', 'Output Type': 'Transistor Sink', 'Communication': 'Ethernet + Serial' } },
          { id: 'tm221ce40u', name: 'TM221CE40U', partNumber: 'TM221CE40U', specifications: { 'Digital I/O': '24 DI / 16 DO', 'Output Type': 'Transistor Source', 'Communication': 'Ethernet + Serial' } },
        ]
      },
      {
        id: 'm241',
        name: 'Modicon M241',
        description: 'Logic controller for complex machines',
        software: 'Machine Expert (SoMachine)',
        models: [
          { id: 'tm241c24r', name: 'TM241C24R', partNumber: 'TM241C24R', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Communication': 'Ethernet + CANopen + Serial' } },
          { id: 'tm241c24t', name: 'TM241C24T', partNumber: 'TM241C24T', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Communication': 'Ethernet + CANopen + Serial' } },
          { id: 'tm241c40r', name: 'TM241C40R', partNumber: 'TM241C40R', specifications: { 'Digital I/O': '24 DI / 16 DO', 'Communication': 'Ethernet + CANopen + Serial' } },
          { id: 'tm241c40t', name: 'TM241C40T', partNumber: 'TM241C40T', specifications: { 'Digital I/O': '24 DI / 16 DO', 'Communication': 'Ethernet + CANopen + Serial' } },
        ]
      },
      {
        id: 'm251',
        name: 'Modicon M251',
        description: 'Logic controller with OPC UA',
        software: 'Machine Expert (SoMachine)',
        models: [
          { id: 'tm251mese', name: 'TM251MESE', partNumber: 'TM251MESE', specifications: { 'I/O': 'Expandable via TM3', 'Communication': 'Dual Ethernet + CANopen' } },
        ]
      },
    ]
  },
  {
    id: 'siemens',
    name: 'Siemens',
    series: [
      {
        id: 's7-1200',
        name: 'S7-1200',
        description: 'Compact controller for simple automation',
        software: 'TIA Portal',
        models: [
          { id: '1211c', name: 'CPU 1211C', specifications: { 'Digital I/O': '6 DI / 4 DO', 'Analog I/O': '2 AI', 'Communication': 'PROFINET' } },
          { id: '1212c', name: 'CPU 1212C', specifications: { 'Digital I/O': '8 DI / 6 DO', 'Analog I/O': '2 AI', 'Communication': 'PROFINET' } },
          { id: '1214c', name: 'CPU 1214C', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Analog I/O': '2 AI', 'Communication': 'PROFINET' } },
          { id: '1215c', name: 'CPU 1215C', specifications: { 'Digital I/O': '14 DI / 10 DO', 'Analog I/O': '2 AI / 2 AO', 'Communication': 'PROFINET x2' } },
        ]
      },
      {
        id: 's7-1500',
        name: 'S7-1500',
        description: 'Advanced controller for demanding applications',
        software: 'TIA Portal',
        models: [
          { id: '1511-1', name: 'CPU 1511-1 PN', specifications: { 'Memory': '150 KB', 'Communication': 'PROFINET' } },
          { id: '1513-1', name: 'CPU 1513-1 PN', specifications: { 'Memory': '300 KB', 'Communication': 'PROFINET' } },
          { id: '1515-2', name: 'CPU 1515-2 PN', specifications: { 'Memory': '500 KB', 'Communication': 'PROFINET x2' } },
          { id: '1517-3', name: 'CPU 1517-3 PN/DP', specifications: { 'Memory': '3 MB', 'Communication': 'PROFINET + PROFIBUS' } },
        ]
      },
    ]
  },
  {
    id: 'rockwell',
    name: 'Rockwell Automation (Allen-Bradley)',
    series: [
      {
        id: 'micrologix',
        name: 'MicroLogix',
        description: 'Micro controller for small applications',
        software: 'RSLogix 500 / Connected Components Workbench',
        models: [
          { id: '1100', name: 'MicroLogix 1100', partNumber: '1763-L16BBB', specifications: { 'Digital I/O': '10 DI / 6 DO', 'Communication': 'Ethernet/IP' } },
          { id: '1400', name: 'MicroLogix 1400', partNumber: '1766-L32BWA', specifications: { 'Digital I/O': '20 DI / 12 DO', 'Communication': 'Ethernet/IP' } },
        ]
      },
      {
        id: 'compactlogix',
        name: 'CompactLogix 5370/5380',
        description: 'Mid-range controller for machine control',
        software: 'Studio 5000',
        models: [
          { id: 'l33er', name: 'CompactLogix 5370 L33ER', partNumber: '1769-L33ER', specifications: { 'Memory': '2 MB', 'Communication': 'EtherNet/IP' } },
          { id: 'l306er', name: 'CompactLogix 5380 L306ER', partNumber: '5069-L306ER', specifications: { 'Memory': '6 MB', 'Communication': 'EtherNet/IP x2' } },
        ]
      },
      {
        id: 'controllogix',
        name: 'ControlLogix 5580',
        description: 'High-performance controller for large systems',
        software: 'Studio 5000',
        models: [
          { id: 'l81e', name: 'ControlLogix 5580 L81E', partNumber: '1756-L81E', specifications: { 'Memory': '10 MB', 'Communication': 'EtherNet/IP' } },
          { id: 'l85e', name: 'ControlLogix 5580 L85E', partNumber: '1756-L85E', specifications: { 'Memory': '40 MB', 'Communication': 'EtherNet/IP' } },
        ]
      },
    ]
  },
  {
    id: 'mitsubishi',
    name: 'Mitsubishi Electric',
    series: [
      {
        id: 'fx5u',
        name: 'MELSEC FX5U',
        description: 'Compact PLC for machine control',
        software: 'GX Works3',
        models: [
          { id: 'fx5u-32m', name: 'FX5U-32MR/ES', specifications: { 'Digital I/O': '16 DI / 16 DO', 'Communication': 'Ethernet + USB' } },
          { id: 'fx5u-64m', name: 'FX5U-64MR/ES', specifications: { 'Digital I/O': '32 DI / 32 DO', 'Communication': 'Ethernet + USB' } },
          { id: 'fx5u-80m', name: 'FX5U-80MR/ES', specifications: { 'Digital I/O': '40 DI / 40 DO', 'Communication': 'Ethernet + USB' } },
        ]
      },
      {
        id: 'iq-r',
        name: 'MELSEC iQ-R',
        description: 'High-performance modular controller',
        software: 'GX Works3',
        models: [
          { id: 'r04', name: 'R04ENCPU', specifications: { 'Program Capacity': '40K steps', 'Communication': 'Ethernet' } },
          { id: 'r08', name: 'R08ENCPU', specifications: { 'Program Capacity': '80K steps', 'Communication': 'Ethernet' } },
          { id: 'r16', name: 'R16ENCPU', specifications: { 'Program Capacity': '160K steps', 'Communication': 'Ethernet' } },
        ]
      },
    ]
  },
  {
    id: 'codesys',
    name: 'CODESYS',
    series: [
      {
        id: 'v3',
        name: 'CODESYS V3',
        description: 'Universal IEC 61131-3 runtime (500+ brands)',
        software: 'CODESYS Development System',
        models: [
          { id: 'generic', name: 'Generic CODESYS Target', specifications: { 'Languages': 'LD, FBD, ST, IL, SFC, CFC', 'Compatibility': '500+ hardware vendors' } },
        ]
      },
    ]
  },
];

// TM3 Expansion Modules for Schneider M221/M241/M251
export interface ExpansionModule {
  id: string;
  name: string;
  partNumber: string;
  category: 'digital-input' | 'digital-output' | 'digital-mixed' | 'analog-input' | 'analog-output' | 'analog-mixed' | 'temperature' | 'relay';
  specifications: Record<string, string>;
  compatibleWith: string[]; // Series IDs that support this module
}

export const tm3ExpansionModules: ExpansionModule[] = [
  // Digital Input Modules
  { id: 'tm3di8', name: 'TM3DI8', partNumber: 'TM3DI8', category: 'digital-input', specifications: { 'Inputs': '8 DI', 'Voltage': '24VDC' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3di16', name: 'TM3DI16', partNumber: 'TM3DI16', category: 'digital-input', specifications: { 'Inputs': '16 DI', 'Voltage': '24VDC' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3di32k', name: 'TM3DI32K', partNumber: 'TM3DI32K', category: 'digital-input', specifications: { 'Inputs': '32 DI', 'Voltage': '24VDC', 'Connector': 'HE10' }, compatibleWith: ['m221', 'm241', 'm251'] },

  // Digital Output Modules
  { id: 'tm3dq8r', name: 'TM3DQ8R', partNumber: 'TM3DQ8R', category: 'relay', specifications: { 'Outputs': '8 DO', 'Type': 'Relay' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3dq8t', name: 'TM3DQ8T', partNumber: 'TM3DQ8T', category: 'digital-output', specifications: { 'Outputs': '8 DO', 'Type': 'Transistor Sink' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3dq8u', name: 'TM3DQ8U', partNumber: 'TM3DQ8U', category: 'digital-output', specifications: { 'Outputs': '8 DO', 'Type': 'Transistor Source' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3dq16r', name: 'TM3DQ16R', partNumber: 'TM3DQ16R', category: 'relay', specifications: { 'Outputs': '16 DO', 'Type': 'Relay' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3dq16t', name: 'TM3DQ16T', partNumber: 'TM3DQ16T', category: 'digital-output', specifications: { 'Outputs': '16 DO', 'Type': 'Transistor Sink' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3dq32tk', name: 'TM3DQ32TK', partNumber: 'TM3DQ32TK', category: 'digital-output', specifications: { 'Outputs': '32 DO', 'Type': 'Transistor Sink', 'Connector': 'HE10' }, compatibleWith: ['m221', 'm241', 'm251'] },

  // Mixed Digital I/O Modules
  { id: 'tm3dm8r', name: 'TM3DM8R', partNumber: 'TM3DM8R', category: 'digital-mixed', specifications: { 'I/O': '4 DI / 4 DO Relay' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3dm24r', name: 'TM3DM24R', partNumber: 'TM3DM24R', category: 'digital-mixed', specifications: { 'I/O': '16 DI / 8 DO Relay' }, compatibleWith: ['m221', 'm241', 'm251'] },

  // Analog Input Modules
  { id: 'tm3ai2', name: 'TM3AI2', partNumber: 'TM3AI2', category: 'analog-input', specifications: { 'Inputs': '2 AI', 'Resolution': '12-bit', 'Range': '0-10V / 4-20mA' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ai4', name: 'TM3AI4', partNumber: 'TM3AI4', category: 'analog-input', specifications: { 'Inputs': '4 AI', 'Resolution': '12-bit', 'Range': '0-10V / 4-20mA' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ai8', name: 'TM3AI8', partNumber: 'TM3AI8', category: 'analog-input', specifications: { 'Inputs': '8 AI', 'Resolution': '12-bit', 'Range': '0-10V / 4-20mA' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ai8g', name: 'TM3AI8/G', partNumber: 'TM3AI8/G', category: 'analog-input', specifications: { 'Inputs': '8 AI', 'Resolution': '16-bit', 'Range': '0-10V / 4-20mA' }, compatibleWith: ['m221', 'm241', 'm251'] },

  // Analog Output Modules
  { id: 'tm3aq2', name: 'TM3AQ2', partNumber: 'TM3AQ2', category: 'analog-output', specifications: { 'Outputs': '2 AO', 'Resolution': '12-bit', 'Range': '0-10V / 4-20mA' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3aq4', name: 'TM3AQ4', partNumber: 'TM3AQ4', category: 'analog-output', specifications: { 'Outputs': '4 AO', 'Resolution': '12-bit', 'Range': '0-10V / 4-20mA' }, compatibleWith: ['m221', 'm241', 'm251'] },

  // Mixed Analog I/O Modules
  { id: 'tm3am6', name: 'TM3AM6', partNumber: 'TM3AM6', category: 'analog-mixed', specifications: { 'I/O': '4 AI / 2 AO', 'Resolution': '12-bit' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3am6g', name: 'TM3AM6/G', partNumber: 'TM3AM6/G', category: 'analog-mixed', specifications: { 'I/O': '4 AI / 2 AO', 'Resolution': '16-bit' }, compatibleWith: ['m221', 'm241', 'm251'] },

  // Temperature Input Modules (RTD/Thermocouple)
  { id: 'tm3ti4', name: 'TM3TI4', partNumber: 'TM3TI4', category: 'temperature', specifications: { 'Inputs': '4 RTD/TC', 'Type': 'Pt100/Pt1000/TC' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ti4g', name: 'TM3TI4/G', partNumber: 'TM3TI4/G', category: 'temperature', specifications: { 'Inputs': '4 RTD/TC', 'Type': 'Pt100/Pt1000/TC', 'Resolution': '16-bit' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ti4d', name: 'TM3TI4D', partNumber: 'TM3TI4D', category: 'temperature', specifications: { 'Inputs': '4 RTD', 'Type': 'Pt100/Pt1000', 'Isolation': 'Channel-to-channel' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ti4dg', name: 'TM3TI4D/G', partNumber: 'TM3TI4D/G', category: 'temperature', specifications: { 'Inputs': '4 RTD', 'Type': 'Pt100/Pt1000', 'Resolution': '16-bit', 'Isolation': 'Channel-to-channel' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ti8t', name: 'TM3TI8T', partNumber: 'TM3TI8T', category: 'temperature', specifications: { 'Inputs': '8 TC', 'Type': 'Thermocouple J/K/T/N/R/S/B/E' }, compatibleWith: ['m221', 'm241', 'm251'] },
  { id: 'tm3ti8tg', name: 'TM3TI8T/G', partNumber: 'TM3TI8T/G', category: 'temperature', specifications: { 'Inputs': '8 TC', 'Type': 'Thermocouple', 'Resolution': '16-bit' }, compatibleWith: ['m221', 'm241', 'm251'] },
];

// Get expansion modules compatible with a series
export function getExpansionModules(seriesId: string): ExpansionModule[] {
  return tm3ExpansionModules.filter(m => m.compatibleWith.includes(seriesId));
}

// Get expansion modules by category
export function getExpansionModulesByCategory(seriesId: string, category: ExpansionModule['category']): ExpansionModule[] {
  return tm3ExpansionModules.filter(m => m.compatibleWith.includes(seriesId) && m.category === category);
}

// Helper functions for cascading selector
export function getAllManufacturers(): PLCManufacturer[] {
  return plcManufacturersHierarchy;
}

export function getManufacturer(manufacturerId: string): PLCManufacturer | undefined {
  return plcManufacturersHierarchy.find(m => m.id === manufacturerId);
}

export function getSeries(manufacturerId: string, seriesId: string): PLCSeries | undefined {
  const manufacturer = getManufacturer(manufacturerId);
  return manufacturer?.series.find(s => s.id === seriesId);
}
