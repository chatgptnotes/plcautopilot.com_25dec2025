#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Decode CODESYS object file binary format
"""

import os
import struct

TEMPLATE_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\template2"

def parse_object_file(filepath):
    """Parse an .object file to understand its structure."""
    with open(filepath, 'rb') as f:
        data = f.read()

    print(f"\n{'='*70}")
    print(f"File: {os.path.basename(filepath)}")
    print(f"Size: {len(data)} bytes")
    print(f"{'='*70}")

    # CODESYS header: 02 20 09 28 + 12 bytes zeros + 4 bytes length
    if data[:4] == b'\x02\x20\x09\x28':
        print("Header: CODESYS format")
        length = struct.unpack('<I', data[16:20])[0]
        print(f"Length field: {length}")

        payload = data[20:]
        print(f"Payload size: {len(payload)} bytes")

        # Check if payload is UTF-16 XML
        if b'<\x00?\x00x\x00m\x00l' in payload[:100]:
            print("Payload type: UTF-16 LE XML")
            try:
                # Find where XML starts
                xml_start = payload.find(b'<\x00?\x00x\x00m\x00l')
                xml_text = payload[xml_start:].decode('utf-16-le', errors='ignore')
                print(f"\nXML Preview (first 500 chars):")
                print(xml_text[:500])
            except Exception as e:
                print(f"Decode error: {e}")

        elif payload[:2] == b'\x0f\x4d' or payload[:2] == b'\x0f\x33':
            # Binary format with 0x0f marker
            print("Payload type: Binary (0x0F marker)")
            print(f"First 50 bytes hex: {payload[:50].hex()}")

            # Look for strings
            strings = []
            current = b''
            for b in payload:
                if 32 <= b <= 126:
                    current += bytes([b])
                else:
                    if len(current) >= 4:
                        strings.append(current.decode('ascii', errors='ignore'))
                    current = b''

            if strings:
                print(f"ASCII strings found: {strings[:10]}")

        else:
            print(f"Payload type: Unknown")
            print(f"First 50 bytes hex: {payload[:50].hex()}")

    else:
        print("NOT CODESYS format!")
        # Check if it's raw XML
        if b'<?xml' in data[:100]:
            print("Raw XML file (no CODESYS header)")
        print(f"First 50 bytes: {data[:50]}")

def main():
    print("CODESYS OBJECT FILE FORMAT ANALYSIS")
    print("="*70)

    # Get object files sorted by size
    files = os.listdir(TEMPLATE_DIR)
    object_files = [f for f in files if f.endswith('.object')]

    sizes = [(f, os.path.getsize(os.path.join(TEMPLATE_DIR, f))) for f in object_files]
    sizes.sort(key=lambda x: x[1])

    # Analyze a sample: smallest, medium, and a couple larger ones
    print("\nAnalyzing small objects (basic structures):")
    for fname, size in sizes[:3]:
        parse_object_file(os.path.join(TEMPLATE_DIR, fname))

    print("\n\nAnalyzing medium objects (likely POUs/configs):")
    mid = len(sizes) // 2
    for fname, size in sizes[mid:mid+2]:
        parse_object_file(os.path.join(TEMPLATE_DIR, fname))

    # Look specifically for the XML format object we found earlier
    print("\n\nAnalyzing known XML format object:")
    xml_objects = [
        "6470a90f-b7cb-43ac-9ae5-94b2338b4573.object",  # 34KB - known XML
        "56eba348-eedb-4aec-83b4-1f43e0e16de2.object"   # 52KB - application?
    ]

    for fname in xml_objects:
        filepath = os.path.join(TEMPLATE_DIR, fname)
        if os.path.exists(filepath):
            parse_object_file(filepath)

    return 0

if __name__ == "__main__":
    main()
