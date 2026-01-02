#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Decode CODESYS meta file binary format
"""

import os
import struct

TEMPLATE_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\template2"

def parse_meta_file(filepath):
    """Parse a .meta file to understand its structure."""
    with open(filepath, 'rb') as f:
        data = f.read()

    print(f"\n{'='*60}")
    print(f"File: {os.path.basename(filepath)}")
    print(f"Size: {len(data)} bytes")
    print(f"{'='*60}")

    # CODESYS header: 02 20 09 28 + 12 bytes zeros + 4 bytes length
    if data[:4] == b'\x02\x20\x09\x28':
        print("Header: CODESYS format detected")
        zeros = data[4:16]
        length = struct.unpack('<I', data[16:20])[0]
        print(f"Length field: {length}")
        print(f"Payload starts at: byte 20")

        payload = data[20:]
        print(f"Payload size: {len(payload)} bytes")

        # Parse payload byte by byte
        print(f"\nPayload hex: {payload.hex()}")
        print(f"\nPayload analysis:")

        pos = 0
        while pos < len(payload):
            byte = payload[pos]

            # 0x0f often marks the start of a type indicator or string
            if byte == 0x0f:
                # Next byte might be type or length
                if pos + 1 < len(payload):
                    next_byte = payload[pos + 1]
                    print(f"  [pos {pos}] Marker 0x0F, next=0x{next_byte:02X}")

                    # Check for known patterns
                    # Type indicators seem to be single bytes like 0x01, 0x2a, etc.

            # Look for GUID-like patterns (32 hex chars = 16 bytes)
            # GUIDs are stored as binary, not hex strings

            pos += 1

        # Try to find parent GUID
        # In CODESYS, GUIDs are 16 bytes
        if len(payload) >= 16:
            # Look for potential GUID locations
            print(f"\nPotential GUID locations:")
            for i in range(0, min(len(payload)-15, 50)):
                potential_guid = payload[i:i+16]
                # Convert to GUID format
                try:
                    guid = f"{potential_guid[3]:02x}{potential_guid[2]:02x}{potential_guid[1]:02x}{potential_guid[0]:02x}-"
                    guid += f"{potential_guid[5]:02x}{potential_guid[4]:02x}-"
                    guid += f"{potential_guid[7]:02x}{potential_guid[6]:02x}-"
                    guid += f"{potential_guid[8]:02x}{potential_guid[9]:02x}-"
                    guid += f"{potential_guid[10]:02x}{potential_guid[11]:02x}{potential_guid[12]:02x}{potential_guid[13]:02x}{potential_guid[14]:02x}{potential_guid[15]:02x}"
                    # Check if it looks like a valid GUID (not all zeros or all same bytes)
                    if len(set(potential_guid)) > 4:  # Has variety
                        print(f"  [offset {i}] {guid}")
                except:
                    pass

    else:
        print("NOT CODESYS format!")
        print(f"First 20 bytes: {data[:20].hex()}")

def main():
    print("CODESYS META FILE FORMAT ANALYSIS")
    print("="*60)

    # Analyze a few meta files of different sizes
    files = os.listdir(TEMPLATE_DIR)
    meta_files = sorted([f for f in files if f.endswith('.meta')],
                       key=lambda x: os.path.getsize(os.path.join(TEMPLATE_DIR, x)))

    # Analyze smallest and medium-sized meta files
    for meta_file in meta_files[:3]:
        filepath = os.path.join(TEMPLATE_DIR, meta_file)
        parse_meta_file(filepath)

    # Also check one of the known GUIDs from the listing
    interesting = [
        "39e6efc7-2287-4bae-860b-148a3a5cb8cd.meta",
        "86ba34fe-2d4f-4627-a22e-5a42df9b65be.meta"
    ]

    for meta_file in interesting:
        filepath = os.path.join(TEMPLATE_DIR, meta_file)
        if os.path.exists(filepath):
            parse_meta_file(filepath)

    return 0

if __name__ == "__main__":
    main()
