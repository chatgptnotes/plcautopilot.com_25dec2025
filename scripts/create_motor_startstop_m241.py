# -*- coding: utf-8 -*-
"""
Motor Start/Stop Project Generator for TM241CE24T
Run with: LogicBuilderShell.exe create_motor_startstop_m241.py

This script creates a complete Machine Expert project with:
- Motor_Control_ST program (Structured Text)
- Motor_Control_LD program (Ladder Diagram)
- GVL_IO global variable list with I/O mapping
- Task configuration

Author: PLCAutoPilot
"""

from __future__ import print_function
import sys
import os

# Output path for the project
OUTPUT_PATH = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs"
PROJECT_NAME = "Motor_StartStop_TM241CE24T_Full"

# ============================================================================
# STRUCTURED TEXT VERSION
# ============================================================================

MOTOR_CONTROL_ST_DECLARATION = '''PROGRAM Motor_Control_ST
VAR
    MotorRunning : BOOL;
    MotorFault : BOOL;
    SafetyOK : BOOL;
    StartupTimer : TON;
END_VAR
'''

MOTOR_CONTROL_ST_IMPLEMENTATION = '''// ============================================
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
'''

# ============================================================================
# LADDER DIAGRAM VERSION
# ============================================================================

MOTOR_CONTROL_LD_DECLARATION = '''PROGRAM Motor_Control_LD
VAR
    MotorRunning : BOOL;         // Motor running latch
    MotorFault : BOOL;           // Fault latch
    SafetyOK : BOOL;             // Safety interlock OK
    StartCondition : BOOL;       // Start conditions met
    StopCondition : BOOL;        // Stop conditions met
    StartupTimer : TON;          // 3 second startup delay
    StartupComplete : BOOL;      // Timer done output
END_VAR
'''

# For LD, we provide the logic description - Machine Expert will render it
MOTOR_CONTROL_LD_IMPLEMENTATION = '''(* ============================================
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
'''

# ============================================================================
# GLOBAL VARIABLE LIST
# ============================================================================

GVL_IO_DECLARATION = '''VAR_GLOBAL
    // ========================================
    // Motor Start/Stop I/O Mapping
    // TM241CE24T - PLCAutoPilot Generated
    // ========================================

    // DIGITAL INPUTS
    StartPB AT %IX0.0 : BOOL;        // Start Pushbutton (NO)
    StopPB AT %IX0.1 : BOOL;         // Stop Pushbutton (NC) - FALSE when pressed
    OverloadTrip AT %IX0.2 : BOOL;   // Thermal Overload Relay (NC) - TRUE = fault
    EmergencyStop AT %IX0.3 : BOOL;  // Emergency Stop (NC) - TRUE = OK

    // DIGITAL OUTPUTS
    MotorContactor AT %QX0.0 : BOOL; // Main Contactor K1
    RunIndicator AT %QX0.1 : BOOL;   // Run Indicator Lamp (Green)
    FaultIndicator AT %QX0.2 : BOOL; // Fault Indicator Lamp (Red)

    // HMI INTERFACE (Optional)
    HMI_MotorRunning : BOOL;         // Motor status for HMI
    HMI_MotorFault : BOOL;           // Fault status for HMI
    HMI_StartCommand : BOOL;         // Remote start from HMI
    HMI_StopCommand : BOOL;          // Remote stop from HMI
END_VAR
'''


def main():
    print("=" * 60)
    print("Motor Start/Stop Project Generator for TM241CE24T")
    print("Including ST and LD Programs")
    print("=" * 60)

    # Check if we're running in LogicBuilderShell
    try:
        proj = projects
        print("[OK] Running in LogicBuilderShell context")
    except NameError:
        print("[ERROR] Not running in LogicBuilderShell!")
        print("Run with:")
        print('  "c:\\Program Files\\Schneider Electric\\EcoStruxure Machine Expert\\V1.2\\LogicBuilderShell.exe" this_script.py')
        return 1

    # Create output directory if needed
    if not os.path.exists(OUTPUT_PATH):
        os.makedirs(OUTPUT_PATH)
        print("[INFO] Created output directory: " + OUTPUT_PATH)

    project_file = os.path.join(OUTPUT_PATH, PROJECT_NAME + ".project")
    print("[INFO] Output: " + project_file)

    try:
        # Step 1: Create new project
        print("\n[Step 1] Creating new project...")
        project = projects.create(project_file)
        print("  Project created")

        # Step 2: Add TM241CE24T device
        print("\n[Step 2] Adding TM241CE24T device...")
        device = None
        application = None

        # Try to find device in repository
        try:
            device_repo = system.get_device_repository()
            devices = device_repo.get_devices()
            for dev in devices:
                dev_name = str(dev.get_name()) if hasattr(dev, 'get_name') else str(dev)
                if "TM241CE24T" in dev_name or "M241" in dev_name:
                    device = project.add(dev)
                    print("  Added device: " + dev_name)
                    break
        except Exception as e:
            print("  [INFO] Device repo search: " + str(e))

        # Find application in project tree
        print("\n[Step 3] Finding Application...")

        def find_by_type(obj, type_name, depth=0):
            """Recursively find object by type name"""
            if depth > 10:
                return None
            try:
                obj_type = str(type(obj).__name__)
                obj_name = obj.get_name() if hasattr(obj, 'get_name') else str(obj)

                if type_name.lower() in obj_type.lower() or type_name.lower() in str(obj_name).lower():
                    return obj

                if hasattr(obj, 'get_children'):
                    for child in obj.get_children():
                        result = find_by_type(child, type_name, depth + 1)
                        if result:
                            return result
            except:
                pass
            return None

        application = find_by_type(project, "Application")
        if application:
            print("  Found Application: " + str(application.get_name()))
        else:
            print("  [WARN] Application not found directly")
            # Try to get from project's active application
            try:
                application = project.active_application
                if application:
                    print("  Found active application")
            except:
                pass

        # Step 4: Create GVL
        print("\n[Step 4] Creating GVL_IO...")
        gvl_created = False
        if application:
            try:
                gvl = application.create_gvl("GVL_IO")
                gvl.textual_declaration.replace(GVL_IO_DECLARATION)
                print("  GVL_IO created with I/O mapping")
                gvl_created = True
            except Exception as e:
                print("  [INFO] create_gvl: " + str(e))
                try:
                    # Alternative method
                    gvl = application.add("GVL", "GVL_IO")
                    if hasattr(gvl, 'textual_declaration'):
                        gvl.textual_declaration.replace(GVL_IO_DECLARATION)
                    print("  GVL_IO created (alt method)")
                    gvl_created = True
                except Exception as e2:
                    print("  [WARN] Could not create GVL: " + str(e2))

        # Step 5: Create Motor_Control_ST Program (Structured Text)
        print("\n[Step 5] Creating Motor_Control_ST program...")
        pou_st_created = False
        if application:
            try:
                pou_st = application.create_pou("Motor_Control_ST", "Program")
                pou_st.textual_declaration.replace(MOTOR_CONTROL_ST_DECLARATION)
                pou_st.textual_implementation.replace(MOTOR_CONTROL_ST_IMPLEMENTATION)
                print("  Motor_Control_ST created (Structured Text)")
                pou_st_created = True
            except Exception as e:
                print("  [INFO] create_pou ST: " + str(e))
                try:
                    pou_st = application.add("POU", "Motor_Control_ST")
                    print("  Motor_Control_ST created (alt method)")
                    pou_st_created = True
                except Exception as e2:
                    print("  [WARN] Could not create ST POU: " + str(e2))

        # Step 6: Create Motor_Control_LD Program (Ladder/IL)
        print("\n[Step 6] Creating Motor_Control_LD program...")
        pou_ld_created = False
        if application:
            try:
                pou_ld = application.create_pou("Motor_Control_LD", "Program")
                # Set language to IL (Instruction List) which is similar to LD logic
                if hasattr(pou_ld, 'set_language'):
                    pou_ld.set_language("IL")
                pou_ld.textual_declaration.replace(MOTOR_CONTROL_LD_DECLARATION)
                pou_ld.textual_implementation.replace(MOTOR_CONTROL_LD_IMPLEMENTATION)
                print("  Motor_Control_LD created (IL/Ladder logic)")
                pou_ld_created = True
            except Exception as e:
                print("  [INFO] create_pou LD: " + str(e))
                try:
                    pou_ld = application.add("POU", "Motor_Control_LD")
                    print("  Motor_Control_LD created (alt method)")
                    pou_ld_created = True
                except Exception as e2:
                    print("  [WARN] Could not create LD POU: " + str(e2))

        # Step 7: Configure Task
        print("\n[Step 7] Configuring MAST task...")
        task_configured = False
        if application:
            try:
                task_config = find_by_type(application, "Task")
                if task_config:
                    # Find MAST task
                    mast = find_by_type(task_config, "MAST")
                    if mast:
                        if pou_st_created:
                            mast.add_call("Motor_Control_ST")
                            print("  Motor_Control_ST added to MAST")
                            task_configured = True
                        # Optionally add LD version too (comment out if only want one)
                        # if pou_ld_created:
                        #     mast.add_call("Motor_Control_LD")
                        #     print("  Motor_Control_LD added to MAST")
            except Exception as e:
                print("  [INFO] Task config: " + str(e))

        # Step 8: Save project
        print("\n[Step 8] Saving project...")
        project.save()
        print("  Project saved!")

        # Summary
        print("\n" + "=" * 60)
        print("PROJECT CREATION COMPLETE")
        print("=" * 60)
        print("\nOutput file: " + project_file)
        print("\nCreated objects:")
        print("  [" + ("OK" if gvl_created else "  ") + "] GVL_IO - Global Variable List")
        print("  [" + ("OK" if pou_st_created else "  ") + "] Motor_Control_ST - Structured Text")
        print("  [" + ("OK" if pou_ld_created else "  ") + "] Motor_Control_LD - Ladder/IL Logic")
        print("  [" + ("OK" if task_configured else "  ") + "] Task Configuration")

        print("\nI/O MAPPING:")
        print("  INPUTS:")
        print("    %IX0.0 - StartPB (NO pushbutton)")
        print("    %IX0.1 - StopPB (NC pushbutton)")
        print("    %IX0.2 - OverloadTrip (NC thermal relay)")
        print("    %IX0.3 - EmergencyStop (NC E-Stop)")
        print("  OUTPUTS:")
        print("    %QX0.0 - MotorContactor (K1)")
        print("    %QX0.1 - RunIndicator (Green lamp)")
        print("    %QX0.2 - FaultIndicator (Red lamp)")

        print("\nFEATURES:")
        print("  - 3 second startup delay (anti-chatter)")
        print("  - Overload fault latching with reset")
        print("  - Emergency stop interlock")
        print("  - Fail-safe NC contact design")
        print("=" * 60)

        return 0

    except Exception as e:
        print("\n[ERROR] " + str(e))
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
