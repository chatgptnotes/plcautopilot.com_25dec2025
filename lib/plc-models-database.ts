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
