/**
 * Machine Expert Scripting Types
 *
 * TypeScript interfaces for the Machine Expert .project automation system.
 */

/**
 * Configuration for generating a complete .project file
 */
export interface ProjectGenerationConfig {
  /** Path to the template .project file */
  templatePath: string;

  /** Path for the output .project file */
  outputPath: string;

  /** POUs to add to the project */
  pous: POUGenerationConfig[];

  /** Optional: Machine Expert installation path */
  machineExpertPath?: string;
}

/**
 * Configuration for a single POU to generate
 */
export interface POUGenerationConfig {
  /** Name of the POU (e.g., 'Main', 'MotorControl') */
  name: string;

  /** POU type */
  pouType: 'program' | 'functionBlock' | 'function';

  /** Programming language */
  language: 'LD' | 'ST' | 'FBD' | 'SFC';

  /** Description or natural language logic specification */
  description: string;

  /** Optional: Pre-defined variables */
  variables?: POUVariable[];

  /** Optional: Pre-generated code/logic (for ST) */
  code?: string;
}

/**
 * Variable definition for a POU
 */
export interface POUVariable {
  name: string;
  type: string; // 'BOOL', 'INT', 'REAL', 'TIME', etc.
  scope: 'VAR_INPUT' | 'VAR_OUTPUT' | 'VAR' | 'VAR_IN_OUT';
  address?: string; // Optional: Direct address like '%IX0.0'
  initialValue?: string;
  comment?: string;
}

/**
 * Result from project generation
 */
export interface ProjectGenerationResult {
  success: boolean;
  projectPath?: string;
  projectBuffer?: Buffer;
  error?: string;
  logs?: string[];
}

/**
 * Machine Expert scripting execution result
 */
export interface ScriptExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number; // milliseconds
}

/**
 * Environment configuration
 */
export interface MachineExpertEnvironment {
  /** Machine Expert installation directory */
  installPath: string;

  /** Path to LogicBuilderShell.exe */
  shellExePath: string;

  /** Version of Machine Expert */
  version: string;

  /** Whether Machine Expert is available/installed */
  isAvailable: boolean;
}

/**
 * Default paths for Machine Expert installation
 */
export const DEFAULT_ME_PATHS = {
  V1_2: 'C:\\Program Files\\Schneider Electric\\EcoStruxure Machine Expert\\V1.2',
  V1_1: 'C:\\Program Files\\Schneider Electric\\EcoStruxure Machine Expert\\V1.1',
  V2_0: 'C:\\Program Files\\Schneider Electric\\EcoStruxure Machine Expert\\V2.0',
} as const;

/**
 * LogicBuilderShell command line options
 */
export interface LogicBuilderShellOptions {
  /** Run without UI (headless mode) */
  noUI?: boolean;

  /** Script to run */
  runScript?: string;

  /** Script arguments (passed after --) */
  scriptArgs?: string[];

  /** Working directory */
  workingDirectory?: string;

  /** Timeout in milliseconds */
  timeout?: number;
}
