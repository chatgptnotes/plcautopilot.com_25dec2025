/**
 * Machine Expert Project Orchestrator
 *
 * Orchestrates the generation of complete .project files by:
 * 1. Generating PLCopenXML using existing generators
 * 2. Executing LogicBuilderShell.exe with automation script
 * 3. Returning the generated .project file
 */

import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type {
  ProjectGenerationConfig,
  ProjectGenerationResult,
  ScriptExecutionResult,
  MachineExpertEnvironment,
  LogicBuilderShellOptions,
  DEFAULT_ME_PATHS,
} from './types';

// Re-export types
export type {
  ProjectGenerationConfig,
  ProjectGenerationResult,
  POUGenerationConfig,
} from './types';

/**
 * Default Machine Expert installation path
 */
const DEFAULT_ME_PATH = 'C:\\Program Files\\Schneider Electric\\EcoStruxure Machine Expert\\V1.2';

/**
 * Path to the Python automation script
 * Note: In Next.js environment, __dirname is not reliable.
 * We resolve from project root using process.cwd()
 */
const SCRIPT_NAME = 'me_project_manager.py';
const SCRIPT_DIR = 'lib/machine-expert-scripting';

/**
 * Check if Machine Expert is available at the specified path
 */
export async function checkMachineExpertInstallation(
  mePath: string = DEFAULT_ME_PATH
): Promise<MachineExpertEnvironment> {
  const shellExePath = path.join(mePath, 'LogicBuilderShell.exe');

  try {
    await fs.access(shellExePath);
    return {
      installPath: mePath,
      shellExePath,
      version: 'V1.2', // Could be detected from path or registry
      isAvailable: true,
    };
  } catch {
    return {
      installPath: mePath,
      shellExePath,
      version: 'unknown',
      isAvailable: false,
    };
  }
}

/**
 * Execute a Python script in LogicBuilderShell.exe
 */
async function executeLogicBuilderScript(
  shellExePath: string,
  scriptPath: string,
  args: string[],
  options: LogicBuilderShellOptions = {}
): Promise<ScriptExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const spawnArgs = [scriptPath, ...args];

    const spawnOptions: SpawnOptions = {
      cwd: options.workingDirectory || path.dirname(scriptPath),
      windowsHide: true,
    };

    const process = spawn(shellExePath, spawnArgs, spawnOptions);

    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Set up timeout
    const timeout = options.timeout || 300000; // 5 minutes default
    const timeoutHandle = setTimeout(() => {
      process.kill();
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr: stderr + '\nProcess timed out',
        duration: Date.now() - startTime,
      });
    }, timeout);

    process.on('close', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: code === 0 && stdout.includes('SUCCESS'),
        exitCode: code || 0,
        stdout,
        stderr,
        duration: Date.now() - startTime,
      });
    });

    process.on('error', (error) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr: stderr + '\n' + error.message,
        duration: Date.now() - startTime,
      });
    });
  });
}

/**
 * Generate a unique temporary file path
 */
function getTempFilePath(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return path.join(os.tmpdir(), `${prefix}_${timestamp}_${random}${extension}`);
}

/**
 * Main orchestration function: Generate a .project file from PLCopenXML
 *
 * @param xmlContent - PLCopenXML content string
 * @param templatePath - Path to template .project file
 * @param outputPath - Optional output path (uses temp if not specified)
 * @param mePath - Optional Machine Expert installation path
 * @param targetModel - Optional target PLC model (e.g., "TM241CE24T")
 * @returns ProjectGenerationResult with the generated project
 */
export async function generateProjectFromXML(
  xmlContent: string,
  templatePath: string,
  outputPath?: string,
  mePath: string = DEFAULT_ME_PATH,
  targetModel?: string
): Promise<ProjectGenerationResult> {
  const logs: string[] = [];

  try {
    // 1. Check Machine Expert installation
    logs.push('Checking Machine Expert installation...');
    const meEnv = await checkMachineExpertInstallation(mePath);

    if (!meEnv.isAvailable) {
      return {
        success: false,
        error: `Machine Expert not found at: ${mePath}`,
        logs,
      };
    }
    logs.push(`Machine Expert found: ${meEnv.shellExePath}`);

    // 2. Check template file exists
    logs.push('Checking template file...');
    try {
      await fs.access(templatePath);
    } catch {
      return {
        success: false,
        error: `Template file not found: ${templatePath}`,
        logs,
      };
    }
    logs.push(`Template file found: ${templatePath}`);

    // 3. Write PLCopenXML to temp file
    logs.push('Writing PLCopenXML to temp file...');
    const xmlTempPath = getTempFilePath('plcopen', '.xml');
    await fs.writeFile(xmlTempPath, xmlContent, 'utf-8');
    logs.push(`PLCopenXML written to: ${xmlTempPath}`);

    // 4. Determine output path
    const finalOutputPath = outputPath || getTempFilePath('project', '.project');
    logs.push(`Output path: ${finalOutputPath}`);

    // 5. Get script path (resolve from project root since __dirname is unreliable in Next.js)
    const scriptPath = path.join(process.cwd(), SCRIPT_DIR, SCRIPT_NAME);
    logs.push(`Script path: ${scriptPath}`);

    // 6. Build script arguments
    const scriptArgs = [templatePath, xmlTempPath, finalOutputPath];
    if (targetModel) {
      scriptArgs.push(targetModel);
      logs.push(`Target PLC model: ${targetModel}`);
    }

    // 7. Execute LogicBuilderShell.exe
    logs.push('Executing Machine Expert automation script...');
    const result = await executeLogicBuilderScript(
      meEnv.shellExePath,
      scriptPath,
      scriptArgs,
      { timeout: 300000 } // 5 minutes
    );

    logs.push(`Script execution completed in ${result.duration}ms`);
    logs.push(`Exit code: ${result.exitCode}`);

    if (result.stdout) {
      logs.push('Script output:');
      logs.push(result.stdout);
    }

    if (result.stderr) {
      logs.push('Script errors:');
      logs.push(result.stderr);
    }

    // 7. Clean up temp XML file
    try {
      await fs.unlink(xmlTempPath);
      logs.push('Cleaned up temp XML file');
    } catch {
      logs.push('Warning: Could not clean up temp XML file');
    }

    // 8. Check result
    if (!result.success) {
      return {
        success: false,
        error: `Script execution failed: ${result.stderr || result.stdout}`,
        logs,
      };
    }

    // 9. Read generated project file
    logs.push('Reading generated project file...');
    try {
      const projectBuffer = await fs.readFile(finalOutputPath);
      logs.push(`Project file read: ${projectBuffer.length} bytes`);

      return {
        success: true,
        projectPath: finalOutputPath,
        projectBuffer,
        logs,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read generated project file: ${error}`,
        logs,
      };
    }
  } catch (error) {
    logs.push(`Unexpected error: ${error}`);
    return {
      success: false,
      error: `Orchestration failed: ${error}`,
      logs,
    };
  }
}

/**
 * Generate a .project file using the full configuration
 *
 * This is the high-level API that:
 * 1. Generates PLCopenXML from POU configurations
 * 2. Calls generateProjectFromXML to create the .project file
 */
export async function generateProject(
  config: ProjectGenerationConfig,
  generateXMLFn: (pous: ProjectGenerationConfig['pous']) => string
): Promise<ProjectGenerationResult> {
  const logs: string[] = [];

  try {
    // 1. Generate PLCopenXML content
    logs.push('Generating PLCopenXML content...');
    const xmlContent = generateXMLFn(config.pous);
    logs.push(`PLCopenXML generated: ${xmlContent.length} characters`);

    // 2. Generate project using the XML
    const result = await generateProjectFromXML(
      xmlContent,
      config.templatePath,
      config.outputPath,
      config.machineExpertPath
    );

    // Merge logs
    return {
      ...result,
      logs: [...logs, ...(result.logs || [])],
    };
  } catch (error) {
    logs.push(`Error: ${error}`);
    return {
      success: false,
      error: `Project generation failed: ${error}`,
      logs,
    };
  }
}

/**
 * Quick test function to verify the orchestrator works
 */
export async function testOrchestrator(): Promise<void> {
  console.log('Testing Machine Expert Orchestrator...\n');

  // Check ME installation
  const meEnv = await checkMachineExpertInstallation();
  console.log('Machine Expert Environment:');
  console.log(`  Path: ${meEnv.installPath}`);
  console.log(`  Shell: ${meEnv.shellExePath}`);
  console.log(`  Available: ${meEnv.isAvailable}`);

  if (!meEnv.isAvailable) {
    console.log('\nMachine Expert not found. Cannot proceed with test.');
    return;
  }

  // Test with a simple PLCopenXML
  const testXML = `<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0201">
  <fileHeader companyName="Test" productName="Test" productVersion="1.0" creationDateTime="2025-12-28T00:00:00"/>
  <contentHeader name="Test" modificationDateTime="2025-12-28T00:00:00">
    <coordinateInfo>
      <fbd><scaling x="1" y="1"/></fbd>
      <ld><scaling x="1" y="1"/></ld>
      <sfc><scaling x="1" y="1"/></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes/>
    <pous>
      <pou name="OrchestratorTestPOU" pouType="program">
        <interface>
          <localVars>
            <variable name="bTest"><type><BOOL/></type></variable>
          </localVars>
        </interface>
        <body>
          <ST><xhtml xmlns="http://www.w3.org/1999/xhtml">bTest := TRUE;</xhtml></ST>
        </body>
      </pou>
    </pous>
  </types>
  <instances><configurations/></instances>
</project>`;

  console.log('\nGenerating test project...');
  const result = await generateProjectFromXML(
    testXML,
    'c:\\Users\\HP\\Documents\\Test_copy.project'
  );

  console.log(`\nResult: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  if (result.projectPath) {
    console.log(`Project file: ${result.projectPath}`);
  }
  if (result.projectBuffer) {
    console.log(`Project size: ${result.projectBuffer.length} bytes`);
  }

  console.log('\nLogs:');
  result.logs?.forEach((log) => console.log(`  ${log}`));
}
