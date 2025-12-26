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

export type { PLCModel } from '@/app/data/plc-models';
