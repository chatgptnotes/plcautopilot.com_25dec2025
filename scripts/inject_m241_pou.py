#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
M241 Project POU Injector v2.0
Injects POUs into an existing Machine Expert .project file
Supports both ST (Structured Text) and LD (Ladder/IL) programs

Usage:
    python inject_m241_pou.py <project_file>
"""

import os
import sys
import zipfile
import tempfile
import shutil
import uuid
import re
from datetime import datetime

# ============================================================================
# STRUCTURED TEXT VERSION
# ============================================================================

MOTOR_CONTROL_ST_DECLARATION = """PROGRAM Motor_Control_ST
VAR
    MotorRunning : BOOL;
    MotorFault : BOOL;
    SafetyOK : BOOL;
    StartupTimer : TON;
END_VAR
"""

MOTOR_CONTROL_ST_IMPLEMENTATION = """// ============================================
// MOTOR START/STOP CONTROL (Structured Text)
// TM241CE24T - PLCAutoPilot Generated
// ============================================

// Safety interlock check
SafetyOK := GVL_IO.EmergencyStop AND NOT GVL_IO.OverloadTrip;

// Fault latching
IF GVL_IO.OverloadTrip THEN
    MotorFault := TRUE;
END_IF;

IF GVL_IO.StartPB AND NOT GVL_IO.OverloadTrip THEN
    MotorFault := FALSE;
END_IF;

// Startup timer (3 second delay)
StartupTimer(
    IN := GVL_IO.StartPB AND SafetyOK AND NOT MotorFault AND NOT MotorRunning,
    PT := T#3S
);

// Motor SET
IF StartupTimer.Q THEN
    MotorRunning := TRUE;
END_IF;

// Motor RESET
IF NOT GVL_IO.StopPB OR NOT SafetyOK OR MotorFault THEN
    MotorRunning := FALSE;
END_IF;

// Outputs
GVL_IO.MotorContactor := MotorRunning;
GVL_IO.RunIndicator := MotorRunning;
GVL_IO.FaultIndicator := MotorFault;
"""

# ============================================================================
# LADDER DIAGRAM VERSION (using IL - Instruction List)
# ============================================================================

MOTOR_CONTROL_LD_DECLARATION = """PROGRAM Motor_Control_LD
VAR
    MotorRunning : BOOL;         // Motor running latch
    MotorFault : BOOL;           // Fault latch
    SafetyOK : BOOL;             // Safety interlock OK
    StartCondition : BOOL;       // Start conditions met
    StopCondition : BOOL;        // Stop conditions met
    StartupTimer : TON;          // 3 second startup delay
    StartupComplete : BOOL;      // Timer done output
END_VAR
"""

MOTOR_CONTROL_LD_IMPLEMENTATION = """(* ============================================
   MOTOR START/STOP CONTROL (Ladder Diagram)
   TM241CE24T - PLCAutoPilot Generated
   ============================================

   RUNG 1: Safety Interlock
   |--[/]-------[/]----------------------(SafetyOK)--|
   | OverloadTrip  EmergencyStop                     |
   | (NC=safe)     (NC=safe when TRUE)               |

   RUNG 2: Fault Latch SET (Overload trips fault)
   |--[ ]--------------------------------(S MotorFault)--|
   | OverloadTrip                                        |

   RUNG 3: Fault Latch RESET (Start + No Overload)
   |--[ ]-------[/]----------------------(R MotorFault)--|
   | StartPB    OverloadTrip                             |

   RUNG 4: Start Conditions
   |--[ ]-------[ ]-------[/]------------(StartCondition)--|
   | StartPB    SafetyOK   MotorFault                      |

   RUNG 5: Startup Timer (3 seconds)
   |--[ ]-------[/]-------[TON 3s]-------(StartupComplete)--|
   | StartCond  MotorRun   StartupTimer                     |

   RUNG 6: Motor Latch SET
   |--[ ]--------------------------------(S MotorRunning)--|
   | StartupComplete                                       |

   RUNG 7: Stop Conditions
   |--[/]---+---[/]---+---[ ]------------(StopCondition)--|
   | StopPB |  SafetyOK|  MotorFault                       |
   |        +---OR-----+                                   |

   RUNG 8: Motor Latch RESET
   |--[ ]--------------------------------(R MotorRunning)--|
   | StopCondition                                         |

   RUNG 9: Contactor Output
   |--[ ]--------------------------------(MotorContactor)--|
   | MotorRunning                                          |

   RUNG 10: Run Indicator
   |--[ ]--------------------------------(RunIndicator)----|
   | MotorRunning                                          |

   RUNG 11: Fault Indicator
   |--[ ]--------------------------------(FaultIndicator)--|
   | MotorFault                                            |
   ============================================ *)

// Ladder logic implemented in IL (Instruction List) for compatibility
// This executes the same logic as the ladder rungs above

// RUNG 1: Safety Interlock
LD    GVL_IO.EmergencyStop
ANDN  GVL_IO.OverloadTrip
ST    SafetyOK

// RUNG 2: Fault Latch SET
LD    GVL_IO.OverloadTrip
S     MotorFault

// RUNG 3: Fault Latch RESET
LD    GVL_IO.StartPB
ANDN  GVL_IO.OverloadTrip
R     MotorFault

// RUNG 4: Start Conditions
LD    GVL_IO.StartPB
AND   SafetyOK
ANDN  MotorFault
ANDN  MotorRunning
ST    StartCondition

// RUNG 5: Startup Timer
CAL   StartupTimer(IN := StartCondition, PT := T#3S)
LD    StartupTimer.Q
ST    StartupComplete

// RUNG 6: Motor Latch SET
LD    StartupComplete
S     MotorRunning

// RUNG 7: Stop Conditions
LDN   GVL_IO.StopPB
ORN   SafetyOK
OR    MotorFault
ST    StopCondition

// RUNG 8: Motor Latch RESET
LD    StopCondition
R     MotorRunning

// RUNG 9-11: Outputs
LD    MotorRunning
ST    GVL_IO.MotorContactor
ST    GVL_IO.RunIndicator
LD    MotorFault
ST    GVL_IO.FaultIndicator
"""

# GVL content for I/O mapping
GVL_CONTENT = """VAR_GLOBAL
    // ========================================
    // Motor Start/Stop I/O Mapping
    // TM241CE24T - PLCAutoPilot Generated
    // ========================================

    // Digital Inputs
    StartPB AT %IX0.0 : BOOL;        // Start Pushbutton (NO)
    StopPB AT %IX0.1 : BOOL;         // Stop Pushbutton (NC)
    OverloadTrip AT %IX0.2 : BOOL;   // Thermal Overload Relay (NC)
    EmergencyStop AT %IX0.3 : BOOL;  // Emergency Stop (NC)

    // Digital Outputs
    MotorContactor AT %QX0.0 : BOOL; // Main Contactor K1
    RunIndicator AT %QX0.1 : BOOL;   // Run Indicator Lamp
    FaultIndicator AT %QX0.2 : BOOL; // Fault Indicator Lamp

    // HMI Interface Variables (optional)
    HMI_MotorStatus : BOOL;          // Motor running status for HMI
    HMI_FaultStatus : BOOL;          // Fault status for HMI
    HMI_StartCmd : BOOL;             // Start command from HMI
    HMI_StopCmd : BOOL;              // Stop command from HMI
END_VAR
"""


def generate_guid():
    """Generate a new GUID in the format used by CODESYS."""
    return str(uuid.uuid4())


def create_pou_meta(pou_name, parent_guid):
    """Create meta file content for a POU."""
    # Meta format: ObjectType\nParentGUID\nObjectName
    return f"Program\n{parent_guid}\n{pou_name}"


def create_pou_object(pou_name, declaration, implementation, language="ST"):
    """Create the object file content for a POU.

    Args:
        pou_name: Name of the POU
        declaration: Variable declarations
        implementation: Implementation code
        language: ST (Structured Text) or IL (Instruction List for Ladder)
    """

    # CODESYS/Machine Expert uses a binary format for .object files
    # For ST/IL POUs, we can create a simplified XML-like structure
    # that Machine Expert can parse

    if language == "IL":
        object_content = f"""<?xml version="1.0" encoding="utf-8"?>
<POU xmlns="http://www.3s-software.com/schemas/2004/08/PLCProject" Name="{pou_name}" POUType="Program" Language="IL">
  <Declaration><![CDATA[{declaration}]]></Declaration>
  <Implementation>
    <IL><![CDATA[{implementation}]]></IL>
  </Implementation>
</POU>
"""
    else:
        object_content = f"""<?xml version="1.0" encoding="utf-8"?>
<POU xmlns="http://www.3s-software.com/schemas/2004/08/PLCProject" Name="{pou_name}" POUType="Program" Language="ST">
  <Declaration><![CDATA[{declaration}]]></Declaration>
  <Implementation>
    <ST><![CDATA[{implementation}]]></ST>
  </Implementation>
</POU>
"""
    return object_content


def create_gvl_object(gvl_name, content):
    """Create the object file content for a GVL."""

    object_content = f"""<?xml version="1.0" encoding="utf-8"?>
<GVL xmlns="http://www.3s-software.com/schemas/2004/08/PLCProject" Name="{gvl_name}">
  <Declaration><![CDATA[{content}]]></Declaration>
</GVL>
"""
    return object_content


def inject_pou_into_project(project_path, output_path=None):
    """
    Inject Motor_Control POU into an existing .project file.

    Args:
        project_path: Path to the template .project file
        output_path: Path for output file (optional, defaults to same location)

    Returns:
        Path to the modified project file
    """

    if output_path is None:
        output_path = project_path

    print(f"[INFO] Opening project: {project_path}")

    # Create temp directory for extraction
    temp_dir = tempfile.mkdtemp(prefix="m241_project_")

    try:
        # Extract the project ZIP
        print(f"[INFO] Extracting to: {temp_dir}")
        with zipfile.ZipFile(project_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        # List extracted files
        extracted_files = os.listdir(temp_dir)
        print(f"[INFO] Found {len(extracted_files)} files in project")

        # Find the Application GUID by looking for existing POUs
        application_guid = None
        existing_pous = []

        for filename in extracted_files:
            if filename.endswith('.meta'):
                meta_path = os.path.join(temp_dir, filename)
                with open(meta_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.strip().split('\n')
                    if len(lines) >= 3:
                        obj_type = lines[0].strip() if len(lines) > 0 else ""
                        parent = lines[1].strip() if len(lines) > 1 else ""
                        name = lines[2].strip() if len(lines) > 2 else ""

                        # Look for Application or POU
                        if 'Application' in obj_type:
                            # The application GUID is the filename without .meta
                            application_guid = filename.replace('.meta', '')
                            print(f"[INFO] Found Application: {application_guid}")

                        if 'Program' in obj_type or 'POU' in obj_type:
                            existing_pous.append({
                                'guid': filename.replace('.meta', ''),
                                'name': name,
                                'parent': parent
                            })

        # If we found existing POUs, use their parent as the application
        if not application_guid and existing_pous:
            application_guid = existing_pous[0]['parent']
            print(f"[INFO] Using parent from existing POU: {application_guid}")

        # Generate new GUIDs for our POUs
        motor_control_st_guid = generate_guid()
        motor_control_ld_guid = generate_guid()
        gvl_guid = generate_guid()

        print(f"[INFO] Creating Motor_Control_ST POU with GUID: {motor_control_st_guid}")
        print(f"[INFO] Creating Motor_Control_LD POU with GUID: {motor_control_ld_guid}")
        print(f"[INFO] Creating GVL_IO with GUID: {gvl_guid}")

        # Create Motor_Control_ST POU (Structured Text)
        # Meta file
        motor_st_meta_path = os.path.join(temp_dir, f"{motor_control_st_guid}.meta")
        with open(motor_st_meta_path, 'w', encoding='utf-8') as f:
            f.write(f"Program\n{application_guid or '00000000-0000-0000-0000-000000000000'}\nMotor_Control_ST")

        # Object file
        motor_st_object_path = os.path.join(temp_dir, f"{motor_control_st_guid}.object")
        pou_st_content = create_pou_object("Motor_Control_ST",
                                           MOTOR_CONTROL_ST_DECLARATION,
                                           MOTOR_CONTROL_ST_IMPLEMENTATION,
                                           language="ST")
        with open(motor_st_object_path, 'w', encoding='utf-8') as f:
            f.write(pou_st_content)

        # Create Motor_Control_LD POU (Ladder/IL)
        # Meta file
        motor_ld_meta_path = os.path.join(temp_dir, f"{motor_control_ld_guid}.meta")
        with open(motor_ld_meta_path, 'w', encoding='utf-8') as f:
            f.write(f"Program\n{application_guid or '00000000-0000-0000-0000-000000000000'}\nMotor_Control_LD")

        # Object file
        motor_ld_object_path = os.path.join(temp_dir, f"{motor_control_ld_guid}.object")
        pou_ld_content = create_pou_object("Motor_Control_LD",
                                           MOTOR_CONTROL_LD_DECLARATION,
                                           MOTOR_CONTROL_LD_IMPLEMENTATION,
                                           language="IL")
        with open(motor_ld_object_path, 'w', encoding='utf-8') as f:
            f.write(pou_ld_content)

        # Create GVL_IO
        # Meta file
        gvl_meta_path = os.path.join(temp_dir, f"{gvl_guid}.meta")
        with open(gvl_meta_path, 'w', encoding='utf-8') as f:
            f.write(f"GVL\n{application_guid or '00000000-0000-0000-0000-000000000000'}\nGVL_IO")

        # Object file
        gvl_object_path = os.path.join(temp_dir, f"{gvl_guid}.object")
        gvl_content = create_gvl_object("GVL_IO", GVL_CONTENT)
        with open(gvl_object_path, 'w', encoding='utf-8') as f:
            f.write(gvl_content)

        # Create the new project ZIP
        print(f"[INFO] Creating output project: {output_path}")

        # Remove old file if it exists and we're overwriting
        if os.path.exists(output_path) and output_path != project_path:
            os.remove(output_path)

        # Create new ZIP with all files
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)

        print(f"[SUCCESS] Project created: {output_path}")
        print(f"[INFO] Added POUs:")
        print(f"  - Motor_Control_ST (Program - Structured Text)")
        print(f"  - Motor_Control_LD (Program - Ladder/IL)")
        print(f"  - GVL_IO (Global Variable List)")
        print(f"")
        print(f"[INFO] I/O MAPPING:")
        print(f"  INPUTS:")
        print(f"    %IX0.0 - StartPB (NO pushbutton)")
        print(f"    %IX0.1 - StopPB (NC pushbutton)")
        print(f"    %IX0.2 - OverloadTrip (NC thermal relay)")
        print(f"    %IX0.3 - EmergencyStop (NC E-Stop)")
        print(f"  OUTPUTS:")
        print(f"    %QX0.0 - MotorContactor (K1)")
        print(f"    %QX0.1 - RunIndicator (Green lamp)")
        print(f"    %QX0.2 - FaultIndicator (Red lamp)")
        print(f"")
        print(f"[INFO] FEATURES:")
        print(f"  - 3 second startup delay (anti-chatter)")
        print(f"  - Overload fault latching with reset")
        print(f"  - Emergency stop interlock")
        print(f"  - Fail-safe NC contact design")

        return output_path

    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    """Main entry point."""

    # Default paths
    project_path = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\Motor_StartStop_TM241CE24T.project"

    if len(sys.argv) > 1:
        project_path = sys.argv[1]

    if not os.path.exists(project_path):
        print(f"[ERROR] Project file not found: {project_path}")
        return 1

    try:
        result = inject_pou_into_project(project_path)
        if result:
            print(f"\n[DONE] Motor Start/Stop project ready!")
            print(f"File: {result}")
            print(f"\nTo use:")
            print(f"1. Open EcoStruxure Machine Expert")
            print(f"2. Open this project file")
            print(f"3. Map I/O in GVL_IO to your physical addresses")
            print(f"4. Compile and download to TM241CE24T")
            return 0
        else:
            return 1
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
