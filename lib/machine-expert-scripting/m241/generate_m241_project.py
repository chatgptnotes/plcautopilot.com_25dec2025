#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
M241 Project Generator for PLCAutoPilot
========================================

Generates complete, deployable EcoStruxure Machine Expert projects
for Schneider Electric M241 PLCs.

Usage:
    "C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe" generate_m241_project.py --config config.json

    Or with command line arguments:
    LogicBuilderShell.exe generate_m241_project.py --name "MyProject" --controller "TM241CE24T" --template motor

Author: PLCAutoPilot
Version: 2.0
Date: 2025-12-30
"""

from __future__ import print_function
import os
import sys
import json
import argparse
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

DEFAULT_CONFIG = {
    "project_name": "GeneratedProject",
    "controller": "TM241CE24T",
    "output_path": "C:\\Projects\\M241",
    "expansion_modules": [],
    "global_variables": [],
    "programs": [],
    "task_interval": "T#20ms",
    "task_priority": 1
}

# M241 Controller Device IDs
M241_DEVICE_IDS = {
    "TM241CE24T": "0000 0070 0000 0001",
    "TM241CE24R": "0000 0070 0000 0002",
    "TM241CE24U": "0000 0070 0000 0003",
    "TM241CE40T": "0000 0070 0000 0004",
    "TM241CE40R": "0000 0070 0000 0005",
    "TM241CE40U": "0000 0070 0000 0006",
    "TM241CEC24T": "0000 0070 0000 0007",
    "TM241CEC24R": "0000 0070 0000 0008",
    "TM241CEC40T": "0000 0070 0000 0009",
    "TM241CEC40R": "0000 0070 0000 000A",
}

# TM3 Expansion Module IDs
TM3_MODULE_IDS = {
    # Digital Input
    "TM3DI8": "0000 0071 0000 0001",
    "TM3DI16": "0000 0071 0000 0002",
    "TM3DI32K": "0000 0071 0000 0003",
    # Digital Output
    "TM3DQ8T": "0000 0071 0000 0010",
    "TM3DQ8R": "0000 0071 0000 0011",
    "TM3DQ16T": "0000 0071 0000 0012",
    "TM3DQ16R": "0000 0071 0000 0013",
    "TM3DQ32TK": "0000 0071 0000 0014",
    # Mixed Digital
    "TM3DM8R": "0000 0071 0000 0020",
    "TM3DM24R": "0000 0071 0000 0021",
    # Analog Input
    "TM3AI2H": "0000 0071 0000 0030",
    "TM3AI4": "0000 0071 0000 0031",
    "TM3AI8": "0000 0071 0000 0032",
    "TM3AI8/G": "0000 0071 0000 0033",
    # Analog Output
    "TM3AQ2": "0000 0071 0000 0040",
    "TM3AQ4": "0000 0071 0000 0041",
    # Mixed Analog
    "TM3AM6": "0000 0071 0000 0050",
    "TM3AM6/G": "0000 0071 0000 0051",
    # Temperature
    "TM3TI4": "0000 0071 0000 0060",
    "TM3TI4/G": "0000 0071 0000 0061",
    "TM3TI4D": "0000 0071 0000 0062",
    "TM3TI8T": "0000 0071 0000 0063",
    # Expert
    "TM3XHSC202": "0000 0071 0000 0070",
    "TM3XPWM302": "0000 0071 0000 0071",
}

# =============================================================================
# LOGGING
# =============================================================================

def log(message, level="INFO"):
    """Print timestamped log message."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("[{}] [{}] {}".format(timestamp, level, message))


def log_error(message):
    """Log error message."""
    log(message, "ERROR")


def log_success(message):
    """Log success message."""
    log(message, "SUCCESS")


# =============================================================================
# PROJECT CREATION
# =============================================================================

def create_m241_project(config):
    """
    Create complete M241 project from configuration.

    Args:
        config: Dictionary with project configuration

    Returns:
        Path to generated .project file or None on failure
    """

    project_name = config.get("project_name", "GeneratedProject")
    controller = config.get("controller", "TM241CE24T")
    output_path = config.get("output_path", "C:\\Projects\\M241")

    # Validate controller
    if controller not in M241_DEVICE_IDS:
        log_error("Unknown controller: {}".format(controller))
        log("Available controllers: {}".format(", ".join(M241_DEVICE_IDS.keys())))
        return None

    # Ensure output directory exists
    if not os.path.exists(output_path):
        os.makedirs(output_path)
        log("Created output directory: {}".format(output_path))

    project_file = os.path.join(output_path, "{}.project".format(project_name))

    log("=" * 60)
    log("M241 PROJECT GENERATOR")
    log("=" * 60)
    log("Project Name: {}".format(project_name))
    log("Controller: {}".format(controller))
    log("Output Path: {}".format(project_file))
    log("=" * 60)

    try:
        # Check if we're running in LogicBuilderShell context
        try:
            _ = projects
            _ = system
        except NameError:
            log_error("Not running in LogicBuilderShell context!")
            log_error("Run this script with LogicBuilderShell.exe")
            return None

        # Step 1: Create new project
        log("Step 1/9: Creating new project...")
        project = projects.create(project_file)
        log("  Project created")

        # Step 2: Add device
        log("Step 2/9: Adding M241 device...")
        device_id = M241_DEVICE_IDS[controller]
        device = project.add("Device", controller, device_id)
        log("  Device added: {} (ID: {})".format(controller, device_id))

        # Step 3: Add expansion modules
        log("Step 3/9: Adding expansion modules...")
        expansion_modules = config.get("expansion_modules", [])
        if expansion_modules:
            for module in expansion_modules:
                slot = module.get("slot", 1)
                module_type = module.get("type", "TM3AI4")

                if module_type in TM3_MODULE_IDS:
                    device.add_io_module(slot, module_type)
                    log("  Added {} at slot {}".format(module_type, slot))
                else:
                    log("  WARNING: Unknown module type: {}".format(module_type))
        else:
            log("  No expansion modules configured")

        # Step 4: Get/Create application
        log("Step 4/9: Setting up application...")
        application = device.find("Application", recursive=True)
        if not application:
            application = device.add("Application", "Application")
            log("  Created new application")
        else:
            log("  Using existing application")

        # Step 5: Add standard libraries
        log("Step 5/9: Adding standard libraries...")
        lib_manager = application.find("Library Manager")
        if lib_manager:
            try:
                lib_manager.add_library("Standard", "*")
                lib_manager.add_library("Util", "*")
                lib_manager.add_library("IoStandard", "*")
                log("  Added Standard, Util, IoStandard libraries")
            except Exception as e:
                log("  WARNING: Could not add libraries: {}".format(str(e)))

        # Step 6: Create GVL with global variables
        log("Step 6/9: Creating global variables...")
        global_variables = config.get("global_variables", [])
        if global_variables:
            gvl = application.create_gvl("GVL")

            gvl_code = "VAR_GLOBAL\n"
            for var in global_variables:
                name = var.get("name", "Var1")
                var_type = var.get("type", "BOOL")
                address = var.get("address", "")
                initial = var.get("initial", "")
                comment = var.get("comment", "")

                if address:
                    line = "    {} AT {} : {}".format(name, address, var_type)
                else:
                    line = "    {} : {}".format(name, var_type)

                if initial:
                    line += " := {}".format(initial)

                line += ";"

                if comment:
                    line += "  // {}".format(comment)

                gvl_code += line + "\n"

            gvl_code += "END_VAR"
            gvl.textual_declaration.replace(gvl_code)
            log("  Created GVL with {} variables".format(len(global_variables)))
        else:
            log("  No global variables configured")

        # Step 7: Create task configuration
        log("Step 7/9: Creating task configuration...")
        task_config = application.find("Task Configuration")
        if not task_config:
            task_config = application.add("TaskConfiguration", "Task Configuration")

        mast_task = task_config.find("MAST")
        if not mast_task:
            mast_task = task_config.create_task("MAST")

        mast_task.set_parameter("Priority", config.get("task_priority", 1))
        mast_task.set_parameter("Interval", config.get("task_interval", "T#20ms"))
        mast_task.set_parameter("Type", "Cyclic")
        log("  MAST task configured: Priority={}, Interval={}".format(
            config.get("task_priority", 1),
            config.get("task_interval", "T#20ms")
        ))

        # Step 8: Create programs
        log("Step 8/9: Creating programs...")
        programs_config = config.get("programs", [])
        if programs_config:
            for prog_config in programs_config:
                prog_name = prog_config.get("name", "Main")
                language = prog_config.get("language", "ST")
                declaration = prog_config.get("declaration", "")
                implementation = prog_config.get("implementation", "")

                log("  Creating program: {} ({})".format(prog_name, language))

                pou = application.create_pou(prog_name, "Program")

                if language:
                    pou.set_language(language)

                if declaration:
                    pou.textual_declaration.replace(declaration)

                if implementation:
                    pou.textual_implementation.replace(implementation)

                # Add to MAST task
                mast_task.add_call(prog_name)
                log("    Added to MAST task")
        else:
            # Create default Main program
            log("  Creating default Main program...")
            pou = application.create_pou("Main", "Program")
            pou.set_language("ST")
            pou.textual_declaration.replace("""
VAR
    // Add your local variables here
END_VAR
""")
            pou.textual_implementation.replace("""
// Main Program
// Add your logic here
""")
            mast_task.add_call("Main")

        # Step 9: Save project
        log("Step 9/9: Saving project...")
        project.save()

        log("=" * 60)
        log_success("PROJECT CREATED SUCCESSFULLY")
        log("Output: {}".format(project_file))
        log("=" * 60)

        return project_file

    except Exception as e:
        log_error("Project creation failed: {}".format(str(e)))
        import traceback
        traceback.print_exc()
        return None


# =============================================================================
# TEMPLATE GENERATORS
# =============================================================================

def generate_motor_start_stop(config):
    """
    Generate motor start/stop control program.

    Features:
    - Start/Stop pushbutton control
    - Overload fault handling
    - 3-second startup delay
    - Run indicator
    """

    log("Generating Motor Start/Stop template...")

    config["programs"] = [{
        "name": "Motor_Control",
        "language": "ST",
        "declaration": """
VAR
    // Control signals
    StartCommand : BOOL;
    StopCommand : BOOL;
    FaultReset : BOOL;

    // Status
    MotorRunning : BOOL;
    MotorFault : BOOL;

    // Timers
    StartupTimer : TON;
    RunTimer : TON;

    // Runtime tracking
    TotalRunTime : TIME;
END_VAR
""",
        "implementation": """
// ============================================
// MOTOR START/STOP CONTROL
// ============================================
// Features:
// - Start/Stop pushbutton control
// - Overload fault handling
// - 3-second startup delay
// - Runtime tracking

// Read inputs from GVL
StartCommand := GVL.StartPB AND NOT GVL.StopPB;
StopCommand := GVL.StopPB;
MotorFault := GVL.OverloadTrip;

// Startup delay timer (3 seconds)
StartupTimer(IN := StartCommand AND NOT MotorFault AND NOT MotorRunning, PT := T#3S);

// Motor running logic
IF StartupTimer.Q THEN
    MotorRunning := TRUE;
END_IF;

IF StopCommand OR MotorFault THEN
    MotorRunning := FALSE;
END_IF;

// Fault reset
IF FaultReset AND NOT GVL.OverloadTrip THEN
    MotorFault := FALSE;
END_IF;

// Runtime tracking
RunTimer(IN := MotorRunning, PT := T#24H);

// Write outputs to GVL
GVL.MotorContactor := MotorRunning;
GVL.RunIndicator := MotorRunning;
GVL.FaultIndicator := MotorFault;
"""
    }]

    config["global_variables"] = [
        {"name": "StartPB", "type": "BOOL", "address": "%IX0.0", "comment": "Start pushbutton"},
        {"name": "StopPB", "type": "BOOL", "address": "%IX0.1", "comment": "Stop pushbutton"},
        {"name": "OverloadTrip", "type": "BOOL", "address": "%IX0.2", "comment": "Overload relay NC"},
        {"name": "MotorContactor", "type": "BOOL", "address": "%QX0.0", "comment": "Main contactor"},
        {"name": "RunIndicator", "type": "BOOL", "address": "%QX0.1", "comment": "Run lamp"},
        {"name": "FaultIndicator", "type": "BOOL", "address": "%QX0.2", "comment": "Fault lamp"},
    ]

    return create_m241_project(config)


def generate_tank_level_control(config):
    """
    Generate tank level control program with analog I/O.

    Features:
    - 4-20mA level sensor input
    - Scaled engineering units (liters)
    - High/Low level alarms
    - Pump control with hysteresis
    """

    log("Generating Tank Level Control template...")

    config["programs"] = [{
        "name": "Tank_Control",
        "language": "ST",
        "declaration": """
VAR
    // Raw and scaled values
    RawLevel : INT;
    ScaledLevel : REAL;
    LevelPercent : REAL;

    // Control states
    PumpRunning : BOOL;
    HighLevelAlarm : BOOL;
    LowLevelAlarm : BOOL;

    // Scaling constants
    CONST
        RAW_MIN : INT := 2000;      // 4mA raw value
        RAW_MAX : INT := 10000;     // 20mA raw value
        LEVEL_MIN : REAL := 0.0;    // Minimum level (liters)
        LEVEL_MAX : REAL := 1000.0; // Maximum level (liters)
    END_CONST
END_VAR
""",
        "implementation": """
// ============================================
// TANK LEVEL CONTROL
// ============================================
// Features:
// - 4-20mA level sensor (2000-10000 raw)
// - Scaling to engineering units (liters)
// - High/Low level alarms
// - Inlet pump control with hysteresis

// Read raw analog value from expansion module
RawLevel := GVL.TankLevelRaw;

// Scale 4-20mA (2000-10000) to engineering units (0-1000 liters)
IF RawLevel < RAW_MIN THEN
    ScaledLevel := LEVEL_MIN;  // Under range
ELSIF RawLevel > RAW_MAX THEN
    ScaledLevel := LEVEL_MAX;  // Over range
ELSE
    ScaledLevel := (INT_TO_REAL(RawLevel - RAW_MIN) / INT_TO_REAL(RAW_MAX - RAW_MIN))
                   * (LEVEL_MAX - LEVEL_MIN) + LEVEL_MIN;
END_IF;

// Calculate percentage
LevelPercent := (ScaledLevel / LEVEL_MAX) * 100.0;

// Level alarms
HighLevelAlarm := ScaledLevel >= GVL.HighSetpoint;
LowLevelAlarm := ScaledLevel <= GVL.LowSetpoint;

// Pump control with hysteresis
// Pump starts when level drops below PumpStartLevel
// Pump stops when level reaches PumpStopLevel
IF ScaledLevel <= GVL.PumpStartLevel THEN
    PumpRunning := TRUE;
ELSIF ScaledLevel >= GVL.PumpStopLevel THEN
    PumpRunning := FALSE;
END_IF;

// Disable pump on high level alarm
IF HighLevelAlarm THEN
    PumpRunning := FALSE;
END_IF;

// Write outputs
GVL.InletPump := PumpRunning;
GVL.HighAlarmLamp := HighLevelAlarm;
GVL.LowAlarmLamp := LowLevelAlarm;

// Write HMI values
GVL.HMI_Level := ScaledLevel;
GVL.HMI_Percent := LevelPercent;
GVL.HMI_PumpStatus := PumpRunning;
"""
    }]

    config["global_variables"] = [
        # Analog Input (from TM3AI4 in slot 1)
        {"name": "TankLevelRaw", "type": "INT", "address": "%IW1.0", "comment": "4-20mA level sensor"},

        # Digital Outputs
        {"name": "InletPump", "type": "BOOL", "address": "%QX0.0", "comment": "Inlet pump contactor"},
        {"name": "HighAlarmLamp", "type": "BOOL", "address": "%QX0.1", "comment": "High level alarm"},
        {"name": "LowAlarmLamp", "type": "BOOL", "address": "%QX0.2", "comment": "Low level alarm"},

        # Setpoints (non-I/O, configurable)
        {"name": "HighSetpoint", "type": "REAL", "initial": "900.0", "comment": "High alarm setpoint (liters)"},
        {"name": "LowSetpoint", "type": "REAL", "initial": "100.0", "comment": "Low alarm setpoint (liters)"},
        {"name": "PumpStartLevel", "type": "REAL", "initial": "300.0", "comment": "Pump start level (liters)"},
        {"name": "PumpStopLevel", "type": "REAL", "initial": "800.0", "comment": "Pump stop level (liters)"},

        # HMI values
        {"name": "HMI_Level", "type": "REAL", "comment": "Current level for HMI (liters)"},
        {"name": "HMI_Percent", "type": "REAL", "comment": "Level percentage for HMI"},
        {"name": "HMI_PumpStatus", "type": "BOOL", "comment": "Pump running status for HMI"},
    ]

    config["expansion_modules"] = [
        {"slot": 1, "type": "TM3AI4"}
    ]

    return create_m241_project(config)


def generate_temperature_control(config):
    """
    Generate temperature control program with RTD input.

    Features:
    - RTD temperature sensor input
    - Heater/Cooler control
    - High/Low temperature alarms
    - Deadband control
    """

    log("Generating Temperature Control template...")

    config["programs"] = [{
        "name": "Temp_Control",
        "language": "ST",
        "declaration": """
VAR
    // Raw and scaled values
    RawTemp : INT;
    Temperature : REAL;

    // Control states
    HeaterOn : BOOL;
    CoolerOn : BOOL;
    HighTempAlarm : BOOL;
    LowTempAlarm : BOOL;

    // Scaling (PT100, 0-200C = 0-10000 raw)
    CONST
        RAW_MIN : INT := 0;
        RAW_MAX : INT := 10000;
        TEMP_MIN : REAL := 0.0;
        TEMP_MAX : REAL := 200.0;
        DEADBAND : REAL := 2.0;
    END_CONST
END_VAR
""",
        "implementation": """
// ============================================
// TEMPERATURE CONTROL
// ============================================
// Features:
// - RTD temperature sensor (PT100)
// - Heater/Cooler control with deadband
// - High/Low temperature alarms

// Read raw value from TM3TI4 module
RawTemp := GVL.TempSensorRaw;

// Scale to engineering units (Celsius)
IF RawTemp < RAW_MIN THEN
    Temperature := TEMP_MIN;
ELSIF RawTemp > RAW_MAX THEN
    Temperature := TEMP_MAX;
ELSE
    Temperature := (INT_TO_REAL(RawTemp - RAW_MIN) / INT_TO_REAL(RAW_MAX - RAW_MIN))
                   * (TEMP_MAX - TEMP_MIN) + TEMP_MIN;
END_IF;

// Temperature alarms
HighTempAlarm := Temperature >= GVL.HighTempSetpoint;
LowTempAlarm := Temperature <= GVL.LowTempSetpoint;

// Heater control with deadband
IF Temperature < (GVL.TempSetpoint - DEADBAND) THEN
    HeaterOn := TRUE;
    CoolerOn := FALSE;
ELSIF Temperature > (GVL.TempSetpoint + DEADBAND) THEN
    HeaterOn := FALSE;
    CoolerOn := TRUE;
ELSIF Temperature >= (GVL.TempSetpoint - DEADBAND/2) AND
      Temperature <= (GVL.TempSetpoint + DEADBAND/2) THEN
    HeaterOn := FALSE;
    CoolerOn := FALSE;
END_IF;

// Disable on alarms
IF HighTempAlarm THEN
    HeaterOn := FALSE;
END_IF;
IF LowTempAlarm THEN
    CoolerOn := FALSE;
END_IF;

// Write outputs
GVL.HeaterContactor := HeaterOn;
GVL.CoolerContactor := CoolerOn;
GVL.HighTempLamp := HighTempAlarm;
GVL.LowTempLamp := LowTempAlarm;

// HMI values
GVL.HMI_Temperature := Temperature;
GVL.HMI_HeaterStatus := HeaterOn;
GVL.HMI_CoolerStatus := CoolerOn;
"""
    }]

    config["global_variables"] = [
        # RTD Input (from TM3TI4 in slot 1)
        {"name": "TempSensorRaw", "type": "INT", "address": "%IW1.0", "comment": "PT100 RTD sensor"},

        # Digital Outputs
        {"name": "HeaterContactor", "type": "BOOL", "address": "%QX0.0", "comment": "Heater contactor"},
        {"name": "CoolerContactor", "type": "BOOL", "address": "%QX0.1", "comment": "Cooler contactor"},
        {"name": "HighTempLamp", "type": "BOOL", "address": "%QX0.2", "comment": "High temp alarm"},
        {"name": "LowTempLamp", "type": "BOOL", "address": "%QX0.3", "comment": "Low temp alarm"},

        # Setpoints
        {"name": "TempSetpoint", "type": "REAL", "initial": "75.0", "comment": "Temperature setpoint (C)"},
        {"name": "HighTempSetpoint", "type": "REAL", "initial": "90.0", "comment": "High alarm (C)"},
        {"name": "LowTempSetpoint", "type": "REAL", "initial": "10.0", "comment": "Low alarm (C)"},

        # HMI values
        {"name": "HMI_Temperature", "type": "REAL", "comment": "Current temp for HMI"},
        {"name": "HMI_HeaterStatus", "type": "BOOL", "comment": "Heater status for HMI"},
        {"name": "HMI_CoolerStatus", "type": "BOOL", "comment": "Cooler status for HMI"},
    ]

    config["expansion_modules"] = [
        {"slot": 1, "type": "TM3TI4"}
    ]

    return create_m241_project(config)


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Main entry point for M241 project generator."""

    parser = argparse.ArgumentParser(
        description="M241 Project Generator for PLCAutoPilot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Generate motor control project:
    LogicBuilderShell.exe generate_m241_project.py --template motor --name "Motor_Control"

  Generate tank level control:
    LogicBuilderShell.exe generate_m241_project.py --template tank --name "Tank_Level"

  Generate from config file:
    LogicBuilderShell.exe generate_m241_project.py --config my_config.json

  Generate for specific controller:
    LogicBuilderShell.exe generate_m241_project.py --controller TM241CE40T --name "MyProject"
        """
    )

    parser.add_argument("--config",
                        help="Path to configuration JSON file")
    parser.add_argument("--template",
                        choices=["motor", "tank", "temperature", "custom"],
                        default="custom",
                        help="Project template to use")
    parser.add_argument("--name",
                        default="GeneratedProject",
                        help="Project name")
    parser.add_argument("--controller",
                        default="TM241CE24T",
                        choices=list(M241_DEVICE_IDS.keys()),
                        help="M241 controller model")
    parser.add_argument("--output",
                        default="C:\\Projects\\M241",
                        help="Output directory")
    parser.add_argument("--list-controllers",
                        action="store_true",
                        help="List available M241 controllers")
    parser.add_argument("--list-modules",
                        action="store_true",
                        help="List available TM3 modules")

    args = parser.parse_args()

    # Handle list options
    if args.list_controllers:
        print("\nAvailable M241 Controllers:")
        print("-" * 40)
        for model in sorted(M241_DEVICE_IDS.keys()):
            print("  {}".format(model))
        return 0

    if args.list_modules:
        print("\nAvailable TM3 Expansion Modules:")
        print("-" * 40)
        for module in sorted(TM3_MODULE_IDS.keys()):
            print("  {}".format(module))
        return 0

    # Load configuration
    if args.config and os.path.exists(args.config):
        log("Loading configuration from: {}".format(args.config))
        with open(args.config, 'r') as f:
            config = json.load(f)
    else:
        config = DEFAULT_CONFIG.copy()

    # Override with command line arguments
    config["project_name"] = args.name
    config["controller"] = args.controller
    config["output_path"] = args.output

    # Generate based on template
    if args.template == "motor":
        result = generate_motor_start_stop(config)
    elif args.template == "tank":
        result = generate_tank_level_control(config)
    elif args.template == "temperature":
        result = generate_temperature_control(config)
    else:
        result = create_m241_project(config)

    if result:
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
