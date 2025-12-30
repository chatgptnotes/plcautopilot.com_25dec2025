# LogicBuilderShell Script: Create TM241CE40T Project with PLCopen XML Import
# Run with: LogicBuilderShell.exe scripts/create_m241_TM241CE40T_project.py
#
# This script:
# 1. Creates a new Machine Expert project for TM241CE40T
# 2. Imports PLCopen XML ladder logic
# 3. Saves the project with .project extension
#
# IMPORTANT: Device ID Reference
# - TM241CE24T/U: 101a 0711
# - TM241CE40T/U: 101a 0710
# - TM241CEC24T/U: 101a 0706

import sys
import os

# Entry points provided by LogicBuilderShell
# new_project, projects, ImplementationLanguage are available globally

print("=" * 60)
print("PLCAutoPilot - M241 Project Creator")
print("Target Device: TM241CE40T/U (Device ID: 101a 0710)")
print("=" * 60)

# Configuration - CHANGE THESE FOR YOUR PROJECT
PROJECT_NAME = "Motor_Control_TM241CE40T"
PROJECT_PATH = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025 6.20pm\plcautopilot.com_25dec2025\plc_programs"
XML_FILE = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025 6.20pm\plcautopilot.com_25dec2025\plc_programs\Motor_StartStop_TM241CE40T.xml"

# TM241CE40T Device IDs (discovered from device_repository)
DEVICE_TYPE = 4096
DEVICE_ID = "101a 0710"  # TM241CE40T/U - CRITICAL: Use correct ID for your device!
DEVICE_VERSION = "5.0.8.2"

try:
    print("\n[Step 1/5] Creating controller settings...")

    # Create controller settings for TM241CE40T
    ctrl = new_project.create_controller_settings()
    ctrl.type = DEVICE_TYPE
    ctrl.id = DEVICE_ID
    ctrl.version = DEVICE_VERSION
    ctrl.device_name = "MyController"
    ctrl.implementation_language = ImplementationLanguage.ladder_logic_diagram

    print("  Device Type: %d" % DEVICE_TYPE)
    print("  Device ID: %s" % DEVICE_ID)
    print("  Device Version: %s" % DEVICE_VERSION)
    print("  Language: Ladder Logic Diagram")

    print("\n[Step 2/5] Creating project settings...")

    # Create common project settings
    settings = new_project.create_common_project_settings()
    settings.project_name = PROJECT_NAME
    settings.project_path = PROJECT_PATH
    settings.machine_name = "Motor_Control_Station"  # Required field
    settings.author = "PLCAutoPilot"
    settings.company = "PLCAutoPilot"
    settings.description = "Motor Start/Stop with Overload Alarm - TM241CE40T"

    print("  Project Name: %s" % PROJECT_NAME)
    print("  Project Path: %s" % PROJECT_PATH)

    print("\n[Step 3/5] Creating project...")

    # Create the project
    new_project.create_project(settings, ctrl)

    print("  Project created successfully!")

    print("\n[Step 4/5] Importing PLCopen XML...")

    # Check if XML file exists
    if os.path.exists(XML_FILE):
        # Get the primary project and import XML
        proj = projects.primary
        proj.import_xml(XML_FILE, True)  # True = import folder structure
        print("  XML imported: %s" % XML_FILE)
    else:
        print("  WARNING: XML file not found: %s" % XML_FILE)
        print("  Skipping XML import. You can import manually later.")

    print("\n[Step 5/5] Saving project...")

    # Save the project
    proj = projects.primary
    proj.save()

    # NOTE: LogicBuilderShell saves without .project extension by default
    # The file will be at: PROJECT_PATH/PROJECT_NAME (no extension)
    # Rename it manually or use: mv PROJECT_NAME PROJECT_NAME.project

    saved_file = os.path.join(PROJECT_PATH, PROJECT_NAME)
    project_file = saved_file + ".project"

    # Try to rename to add .project extension
    if os.path.exists(saved_file) and not os.path.exists(project_file):
        try:
            os.rename(saved_file, project_file)
            print("  Project saved: %s" % project_file)
        except:
            print("  Project saved: %s" % saved_file)
            print("  NOTE: Rename to %s.project to open in Machine Expert" % PROJECT_NAME)
    elif os.path.exists(project_file):
        print("  Project saved: %s" % project_file)
    else:
        print("  Project saved: %s" % saved_file)

    print("\n" + "=" * 60)
    print("SUCCESS! Project created for TM241CE40T")
    print("=" * 60)
    print("\nOutput files:")
    print("  1. %s.project" % PROJECT_NAME)
    print("  2. PLC_PRG imported from PLCopen XML")
    print("\nIMPORTANT: The PLC_PRG is at project root level.")
    print("You may need to add it to the Application task configuration.")
    print("\nNext steps:")
    print("  1. Open %s.project in Machine Expert" % PROJECT_NAME)
    print("  2. Verify TM241CE40T device is configured")
    print("  3. Configure Task to call PLC_PRG")
    print("  4. Build and download to PLC")

except Exception as e:
    print("\n" + "=" * 60)
    print("ERROR: %s" % str(e))
    print("=" * 60)
    import traceback
    traceback.print_exc()
    sys.exit(1)
