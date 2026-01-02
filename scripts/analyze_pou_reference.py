#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Analyze reference project with POU to understand exact format
"""

import os
import struct

REF_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\ref_pou"
TEMPLATE_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\template2"

def get_files(directory):
    """Get all files in directory."""
    files = {}
    for f in os.listdir(directory):
        filepath = os.path.join(directory, f)
        if os.path.isfile(filepath):
            files[f] = os.path.getsize(filepath)
    return files

def read_file(filepath):
    """Read file content."""
    with open(filepath, 'rb') as f:
        return f.read()

def parse_codesys_file(data):
    """Parse CODESYS format file."""
    if len(data) >= 20 and data[:4] == b'\x02\x20\x09\x28':
        length = struct.unpack('<I', data[16:20])[0]
        payload = data[20:]
        return {
            'has_header': True,
            'length': length,
            'payload': payload
        }
    return {'has_header': False, 'payload': data}

def main():
    print("="*70)
    print("ANALYZING REFERENCE PROJECT WITH POU")
    print("="*70)

    # Get files from both directories
    ref_files = get_files(REF_DIR)
    template_files = get_files(TEMPLATE_DIR)

    print(f"\nReference project: {len(ref_files)} files")
    print(f"Template project: {len(template_files)} files")

    # Find new files in reference (the POU!)
    new_files = set(ref_files.keys()) - set(template_files.keys())
    print(f"\nNEW FILES (POU-related): {len(new_files)}")

    for fname in sorted(new_files):
        print(f"  {fname}: {ref_files[fname]} bytes")

    # Find modified files
    modified_files = []
    for fname in ref_files:
        if fname in template_files and ref_files[fname] != template_files[fname]:
            modified_files.append((fname, template_files[fname], ref_files[fname]))

    print(f"\nMODIFIED FILES: {len(modified_files)}")
    for fname, old_size, new_size in modified_files:
        print(f"  {fname}: {old_size} -> {new_size} bytes")

    # Analyze new POU files
    print("\n" + "="*70)
    print("POU FILE ANALYSIS")
    print("="*70)

    for fname in sorted(new_files):
        filepath = os.path.join(REF_DIR, fname)
        data = read_file(filepath)
        parsed = parse_codesys_file(data)

        print(f"\n{'='*60}")
        print(f"FILE: {fname}")
        print(f"SIZE: {len(data)} bytes")
        print(f"{'='*60}")

        if parsed['has_header']:
            print(f"CODESYS Header: YES")
            print(f"Length field: {parsed['length']}")
            print(f"Payload size: {len(parsed['payload'])} bytes")

            payload = parsed['payload']
            print(f"\nPayload hex dump:")
            # Print in rows of 32 bytes
            for i in range(0, min(len(payload), 200), 32):
                hex_str = payload[i:i+32].hex()
                # Format as pairs
                hex_pairs = ' '.join(hex_str[j:j+2] for j in range(0, len(hex_str), 2))
                print(f"  {i:04d}: {hex_pairs}")

            # Check for XML
            if b'<\x00?\x00x\x00m\x00l' in payload[:100]:
                print(f"\nPayload type: UTF-16 LE XML")
                try:
                    xml_text = payload.decode('utf-16-le', errors='ignore')
                    print(f"\nXML Content (first 1000 chars):")
                    print(xml_text[:1000])
                except:
                    pass
            elif b'<?xml' in payload[:100]:
                print(f"\nPayload type: UTF-8 XML")
                try:
                    xml_text = payload.decode('utf-8', errors='ignore')
                    print(f"\nXML Content (first 1000 chars):")
                    print(xml_text[:1000])
                except:
                    pass
            else:
                print(f"\nPayload type: Binary")

                # Look for readable strings
                strings = []
                current = b''
                for b in payload:
                    if 32 <= b <= 126:
                        current += bytes([b])
                    else:
                        if len(current) >= 3:
                            strings.append(current.decode('ascii'))
                        current = b''
                if strings:
                    print(f"Readable strings: {strings[:20]}")
        else:
            print("No CODESYS header - raw content")
            print(f"First 100 bytes: {data[:100].hex()}")

    # Also analyze modified files to see what changed
    print("\n" + "="*70)
    print("MODIFIED FILE ANALYSIS (Project tree updates)")
    print("="*70)

    for fname, old_size, new_size in modified_files[:3]:
        filepath = os.path.join(REF_DIR, fname)
        data = read_file(filepath)
        parsed = parse_codesys_file(data)

        print(f"\n{fname}: {old_size} -> {new_size} bytes")
        if parsed['has_header'] and b'<\x00?\x00x\x00m\x00l' in parsed['payload'][:100]:
            # Look for POU references in XML
            try:
                xml_text = parsed['payload'].decode('utf-16-le', errors='ignore')
                if 'Test_POU' in xml_text or 'POU' in xml_text:
                    # Find context around POU
                    idx = xml_text.find('Test_POU')
                    if idx == -1:
                        idx = xml_text.find('POU')
                    if idx >= 0:
                        print(f"  Contains POU reference at char {idx}")
                        print(f"  Context: ...{xml_text[max(0,idx-50):idx+100]}...")
            except:
                pass

    return 0

if __name__ == "__main__":
    main()
