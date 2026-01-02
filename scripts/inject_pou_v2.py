#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Machine Expert POU Injector v2.0
Uses correct CODESYS binary wrapper format

Run: python inject_pou_v2.py <template.project> <output.project>
"""

import os
import sys
import struct
import zipfile
import tempfile
import shutil
import uuid

# CODESYS header magic
CODESYS_MAGIC = b'\x02\x20\x09\x28'
CODESYS_ZEROS = b'\x00' * 12

def create_codesys_header(payload_length):
    """Create CODESYS binary header."""
    return CODESYS_MAGIC + CODESYS_ZEROS + struct.pack('<I', payload_length)

def wrap_xml_payload(xml_content):
    """Wrap XML content with CODESYS header.

    The XML must be UTF-16 LE encoded.
    """
    # Encode as UTF-16 LE (without BOM, CODESYS doesn't use BOM)
    xml_bytes = xml_content.encode('utf-16-le')
    header = create_codesys_header(len(xml_bytes))
    return header + xml_bytes

def create_pou_xml(name, declaration, implementation, language="ST"):
    """Create POU in CODESYS internal XML format."""

    # CODESYS uses a specific XML schema with <Single>, <Dictionary>, etc.
    # But for POUs, a simpler PLCopen-like format might work

    if language == "IL":
        impl_tag = "IL"
    else:
        impl_tag = "ST"

    xml = f'''<?xml version="1.0" encoding="utf-16"?>
<POU xmlns="http://www.3s-software.com/schemas/2004/08/PLCProject" Name="{name}" POUType="Program" Language="{language}">
  <Declaration><![CDATA[{declaration}]]></Declaration>
  <Implementation>
    <{impl_tag}><![CDATA[{implementation}]]></{impl_tag}>
  </Implementation>
</POU>'''
    return xml

def create_gvl_xml(name, declaration):
    """Create GVL in CODESYS internal XML format."""
    xml = f'''<?xml version="1.0" encoding="utf-16"?>
<GVL xmlns="http://www.3s-software.com/schemas/2004/08/PLCProject" Name="{name}">
  <Declaration><![CDATA[{declaration}]]></Declaration>
</GVL>'''
    return xml

def create_binary_meta(object_type, parent_guid=None):
    """Create a binary meta file payload.

    Note: This is a simplified version - full format is complex.
    The meta format uses CODESYS serialization.
    """
    # For now, we'll create a minimal placeholder
    # Real implementation needs full reverse engineering of the meta format

    # Type markers we've seen:
    # 0x0f 0x01 - simple type
    # 0x0f 0x0d - complex type with multiple fields

    # Simplified: just use type marker + some padding
    payload = b'\x0f\x01'

    if parent_guid:
        # Add parent GUID reference (16 bytes)
        guid_bytes = uuid.UUID(parent_guid).bytes_le
        payload += guid_bytes

    # Add timestamp-like suffix (8 bytes) - seems to be common
    payload += b'\x47\xde\x08\x00\x00\x00\x00\x00'

    return payload

# Motor Control POU content
MOTOR_ST_DECL = '''PROGRAM Motor_Control_ST
VAR
    MotorRunning : BOOL;
    MotorFault : BOOL;
    SafetyOK : BOOL;
    StartupTimer : TON;
END_VAR'''

MOTOR_ST_IMPL = '''// Motor Start/Stop Control - Structured Text
// TM241CE24T - PLCAutoPilot Generated

// Safety interlock
SafetyOK := GVL_IO.EmergencyStop AND NOT GVL_IO.OverloadTrip;

// Fault latching
IF GVL_IO.OverloadTrip THEN
    MotorFault := TRUE;
END_IF;

IF GVL_IO.StartPB AND NOT GVL_IO.OverloadTrip THEN
    MotorFault := FALSE;
END_IF;

// Startup timer (3s delay)
StartupTimer(
    IN := GVL_IO.StartPB AND SafetyOK AND NOT MotorFault AND NOT MotorRunning,
    PT := T#3S
);

// Motor control
IF StartupTimer.Q THEN
    MotorRunning := TRUE;
END_IF;

IF NOT GVL_IO.StopPB OR NOT SafetyOK OR MotorFault THEN
    MotorRunning := FALSE;
END_IF;

// Outputs
GVL_IO.MotorContactor := MotorRunning;
GVL_IO.RunIndicator := MotorRunning;
GVL_IO.FaultIndicator := MotorFault;'''

GVL_IO_DECL = '''VAR_GLOBAL
    // Digital Inputs
    StartPB AT %IX0.0 : BOOL;        // Start Pushbutton (NO)
    StopPB AT %IX0.1 : BOOL;         // Stop Pushbutton (NC)
    OverloadTrip AT %IX0.2 : BOOL;   // Thermal Overload (NC)
    EmergencyStop AT %IX0.3 : BOOL;  // Emergency Stop (NC)

    // Digital Outputs
    MotorContactor AT %QX0.0 : BOOL; // Main Contactor K1
    RunIndicator AT %QX0.1 : BOOL;   // Run Indicator Lamp
    FaultIndicator AT %QX0.2 : BOOL; // Fault Indicator Lamp
END_VAR'''


def inject_pou(template_path, output_path):
    """Inject Motor Control POU into template project."""

    print(f"[INFO] Template: {template_path}")
    print(f"[INFO] Output: {output_path}")

    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix="m241_inject_")

    try:
        # Extract template
        print("[INFO] Extracting template...")
        with zipfile.ZipFile(template_path, 'r') as zf:
            zf.extractall(temp_dir)

        files = os.listdir(temp_dir)
        print(f"[INFO] Found {len(files)} files in template")

        # Generate GUIDs for new objects
        pou_guid = str(uuid.uuid4())
        gvl_guid = str(uuid.uuid4())

        print(f"[INFO] Motor_Control_ST GUID: {pou_guid}")
        print(f"[INFO] GVL_IO GUID: {gvl_guid}")

        # Create Motor_Control_ST POU
        pou_xml = create_pou_xml("Motor_Control_ST", MOTOR_ST_DECL, MOTOR_ST_IMPL, "ST")
        pou_object = wrap_xml_payload(pou_xml)

        pou_object_path = os.path.join(temp_dir, f"{pou_guid}.object")
        with open(pou_object_path, 'wb') as f:
            f.write(pou_object)
        print(f"[OK] Created {pou_guid}.object ({len(pou_object)} bytes)")

        # Create POU meta (simplified)
        pou_meta_payload = create_binary_meta("Program")
        pou_meta = create_codesys_header(len(pou_meta_payload)) + pou_meta_payload

        pou_meta_path = os.path.join(temp_dir, f"{pou_guid}.meta")
        with open(pou_meta_path, 'wb') as f:
            f.write(pou_meta)
        print(f"[OK] Created {pou_guid}.meta ({len(pou_meta)} bytes)")

        # Create GVL_IO
        gvl_xml = create_gvl_xml("GVL_IO", GVL_IO_DECL)
        gvl_object = wrap_xml_payload(gvl_xml)

        gvl_object_path = os.path.join(temp_dir, f"{gvl_guid}.object")
        with open(gvl_object_path, 'wb') as f:
            f.write(gvl_object)
        print(f"[OK] Created {gvl_guid}.object ({len(gvl_object)} bytes)")

        # Create GVL meta (simplified)
        gvl_meta_payload = create_binary_meta("GVL")
        gvl_meta = create_codesys_header(len(gvl_meta_payload)) + gvl_meta_payload

        gvl_meta_path = os.path.join(temp_dir, f"{gvl_guid}.meta")
        with open(gvl_meta_path, 'wb') as f:
            f.write(gvl_meta)
        print(f"[OK] Created {gvl_guid}.meta ({len(gvl_meta)} bytes)")

        # Create output ZIP
        print("[INFO] Creating output project...")
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, filenames in os.walk(temp_dir):
                for filename in filenames:
                    filepath = os.path.join(root, filename)
                    arcname = os.path.relpath(filepath, temp_dir)
                    zf.write(filepath, arcname)

        print(f"[SUCCESS] Created: {output_path}")
        print(f"\nPOUs added:")
        print(f"  - Motor_Control_ST (Structured Text)")
        print(f"  - GVL_IO (Global Variable List)")

        return True

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    template_path = r"c:\Users\HP\Documents\Untitled2.project"
    output_path = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\Motor_StartStop_v2.project"

    if len(sys.argv) > 1:
        template_path = sys.argv[1]
    if len(sys.argv) > 2:
        output_path = sys.argv[2]

    if not os.path.exists(template_path):
        print(f"[ERROR] Template not found: {template_path}")
        return 1

    inject_pou(template_path, output_path)
    return 0

if __name__ == "__main__":
    sys.exit(main())
