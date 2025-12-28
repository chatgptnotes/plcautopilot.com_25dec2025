/**
 * PLCopenXML Types for M241/M251/M258 PLC Code Generation
 *
 * Based on IEC 61131-3 PLCopen XML exchange format (TC6)
 * Used for importing programs into EcoStruxure Machine Expert
 *
 * Reference: https://www.plcopen.org/technical-activities/xml-exchange
 */

// ============================================================================
// Core PLCopen XML Structure Types
// ============================================================================

export interface PLCopenProject {
  fileHeader: FileHeader;
  contentHeader: ContentHeader;
  types: Types;
  instances: Instances;
}

export interface FileHeader {
  companyName?: string;
  productName?: string;
  productVersion?: string;
  creationDateTime: string;
  contentDescription?: string;
}

export interface ContentHeader {
  name: string;
  version?: string;
  modificationDateTime?: string;
  author?: string;
  organization?: string;
  language?: string;
}

// ============================================================================
// Data Types
// ============================================================================

export interface Types {
  dataTypes: DataType[];
  pous: POU[];
}

export interface DataType {
  name: string;
  baseType?: string;
  struct?: StructMember[];
  array?: ArrayType;
  enum?: EnumValue[];
}

export interface StructMember {
  name: string;
  type: string;
  initialValue?: string;
}

export interface ArrayType {
  baseType: string;
  dimension: ArrayDimension[];
}

export interface ArrayDimension {
  lower: number;
  upper: number;
}

export interface EnumValue {
  name: string;
  value?: number;
}

// ============================================================================
// Program Organization Units (POUs)
// ============================================================================

export type POUType = 'program' | 'function' | 'functionBlock';
export type LanguageType = 'LD' | 'ST' | 'FBD' | 'SFC' | 'IL';

export interface POU {
  name: string;
  pouType: POUType;
  interface: POUInterface;
  body: POUBody;
  documentation?: string;
}

export interface POUInterface {
  returnType?: string;
  localVars: Variable[];
  inputVars: Variable[];
  outputVars: Variable[];
  inOutVars: Variable[];
  tempVars: Variable[];
  globalVars: Variable[];
}

export interface Variable {
  name: string;
  type: string;
  address?: string;
  initialValue?: string;
  documentation?: string;
  constant?: boolean;
  retain?: boolean;
}

export interface POUBody {
  language: LanguageType;
  ld?: LadderDiagram;
  st?: StructuredText;
  fbd?: FunctionBlockDiagram;
  sfc?: SequentialFunctionChart;
  il?: InstructionList;
}

// ============================================================================
// Ladder Diagram (LD) Types
// ============================================================================

export interface LadderDiagram {
  rungs: LDRung[];
}

export interface LDRung {
  localId: number;
  label?: string;
  comment?: string;
  elements: LDElement[];
  connections: LDConnection[];
}

export interface LDElement {
  localId: number;
  type: LDElementType;
  variable?: string;
  expression?: string;
  negated?: boolean;
  edge?: 'rising' | 'falling';
  position: Position;
  connectionPointIn?: ConnectionPointIn;
  connectionPointOut?: ConnectionPointOut;
}

export type LDElementType =
  | 'leftPowerRail'
  | 'rightPowerRail'
  | 'contact'
  | 'coil'
  | 'block'
  | 'continuation'
  | 'jump'
  | 'label'
  | 'return'
  | 'actionBlock';

export interface Position {
  x: number;
  y: number;
}

export interface ConnectionPointIn {
  connections: ConnectionRef[];
}

export interface ConnectionPointOut {
  formalParameter?: string;
}

export interface ConnectionRef {
  refLocalId: number;
  formalParameter?: string;
}

export interface LDConnection {
  localId: number;
  type: 'connector' | 'continuation';
  name: string;
}

// ============================================================================
// Structured Text (ST) Types
// ============================================================================

export interface StructuredText {
  code: string;
}

// ============================================================================
// Function Block Diagram (FBD) Types
// ============================================================================

export interface FunctionBlockDiagram {
  elements: FBDElement[];
}

export interface FBDElement {
  localId: number;
  type: FBDElementType;
  typeName?: string;
  instanceName?: string;
  expression?: string;
  position: Position;
  inputVariables?: FBDVariable[];
  outputVariables?: FBDVariable[];
  inOutVariables?: FBDVariable[];
}

export type FBDElementType =
  | 'block'
  | 'inVariable'
  | 'outVariable'
  | 'inOutVariable'
  | 'connector'
  | 'continuation'
  | 'return'
  | 'jump'
  | 'label';

export interface FBDVariable {
  formalParameter: string;
  connectionPointIn?: ConnectionPointIn;
  connectionPointOut?: ConnectionPointOut;
}

// ============================================================================
// Sequential Function Chart (SFC) Types
// ============================================================================

export interface SequentialFunctionChart {
  steps: SFCStep[];
  transitions: SFCTransition[];
  actions: SFCAction[];
}

export interface SFCStep {
  localId: number;
  name: string;
  initialStep: boolean;
  position: Position;
  connectionPointIn?: ConnectionPointIn;
  connectionPointOut?: ConnectionPointOut;
  connectionPointOutAction?: ConnectionPointOut;
}

export interface SFCTransition {
  localId: number;
  name?: string;
  condition: string;
  position: Position;
  connectionPointIn?: ConnectionPointIn;
  connectionPointOut?: ConnectionPointOut;
}

export interface SFCAction {
  localId: number;
  name: string;
  qualifier: SFCActionQualifier;
  body: POUBody;
  position: Position;
  connectionPointIn?: ConnectionPointIn;
}

export type SFCActionQualifier = 'N' | 'R' | 'S' | 'L' | 'D' | 'P' | 'SD' | 'DS' | 'SL' | 'P0' | 'P1';

// ============================================================================
// Instruction List (IL) Types
// ============================================================================

export interface InstructionList {
  instructions: ILInstruction[];
}

export interface ILInstruction {
  label?: string;
  operator: string;
  operand?: string;
  comment?: string;
}

// ============================================================================
// Instances (Configuration/Resources/Tasks)
// ============================================================================

export interface Instances {
  configurations: Configuration[];
}

export interface Configuration {
  name: string;
  resources: Resource[];
  globalVars?: Variable[];
}

export interface Resource {
  name: string;
  tasks: Task[];
  globalVars?: Variable[];
  pouInstances: POUInstance[];
}

export interface Task {
  name: string;
  priority: number;
  interval?: string;
  single?: string;
}

export interface POUInstance {
  name: string;
  typeName: string;
  taskName?: string;
}

// ============================================================================
// M241-Specific Types
// ============================================================================

export interface M241IOConfig {
  digitalInputs: M241DigitalIO[];
  digitalOutputs: M241DigitalIO[];
  analogInputs: M241AnalogIO[];
  analogOutputs: M241AnalogIO[];
}

export interface M241DigitalIO {
  address: string;  // e.g., %I0.0, %Q0.0
  name: string;
  comment?: string;
}

export interface M241AnalogIO {
  address: string;  // e.g., %IW0.0, %QW0.0
  name: string;
  type: '0_10V' | '4_20mA' | '0_20mA';
  min?: number;
  max?: number;
  comment?: string;
}

export interface M241TimerConfig {
  name: string;
  type: 'TON' | 'TOF' | 'TP';
  preset: string;  // e.g., T#1s, T#500ms
}

export interface M241CounterConfig {
  name: string;
  type: 'CTU' | 'CTD' | 'CTUD';
  preset: number;
}

export interface M241ProgramConfig {
  projectName: string;
  plcModel: string;  // e.g., TM241CE24T
  language: LanguageType;
  io: M241IOConfig;
  timers?: M241TimerConfig[];
  counters?: M241CounterConfig[];
  memoryVars?: Variable[];
}

// ============================================================================
// Generator Output Types
// ============================================================================

export interface GeneratorResult {
  success: boolean;
  xml?: string;
  error?: string;
  warnings?: string[];
}
