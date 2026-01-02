#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Analyze Untitled2.project template structure
"""

import os
import struct

TEMPLATE_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\template2"

def read_codesys_file(filepath):
    """Read a CODESYS format file and extract header + payload."""
    with open(filepath, 'rb') as f:
        data = f.read()

    # Check for CODESYS header
    if len(data) >= 20 and data[:4] == b'\x02\x20\x09\x28':
        length = struct.unpack('<I', data[16:20])[0]
        payload = data[20:]
        return {
            'has_header': True,
            'length_field': length,
            'payload': payload,
            'raw': data
        }
    return {
        'has_header': False,
        'payload': data,
        'raw': data
    }

def decode_payload(payload):
    """Try to decode payload as UTF-16 LE."""
    try:
        # Skip any leading bytes that aren't part of XML
        start = 0
        for i in range(min(len(payload), 100)):
            if payload[i:i+2] == b'<\x00' or payload[i:i+1] == b'<':
                start = i
                break

        # Try UTF-16 LE
        text = payload[start:].decode('utf-16-le', errors='ignore')
        if '<?xml' in text or '<Single' in text or '<POU' in text:
            return text
    except:
        pass

    try:
        # Try UTF-8
        text = payload.decode('utf-8', errors='ignore')
        if '<?xml' in text or '<Single' in text or '<POU' in text:
            return text
    except:
        pass

    return None

def find_pou_files():
    """Find files that contain POU definitions."""
    pou_files = []

    for filename in os.listdir(TEMPLATE_DIR):
        if not filename.endswith('.object'):
            continue

        filepath = os.path.join(TEMPLATE_DIR, filename)
        result = read_codesys_file(filepath)

        # Check if payload contains POU-related content
        payload = result['payload']

        # Search for POU indicators
        indicators = [b'POU', b'PROGRAM', b'Program', b'VAR', b'END_VAR',
                     b'FUNCTION', b'Function', b'FB', b'FunctionBlock',
                     b'textual_declaration', b'ST_Implementation']

        found = []
        for ind in indicators:
            if ind in payload:
                found.append(ind.decode('utf-8', errors='ignore'))

        if found:
            text = decode_payload(payload)
            pou_files.append({
                'filename': filename,
                'guid': filename.replace('.object', ''),
                'size': len(result['raw']),
                'has_header': result['has_header'],
                'indicators': found,
                'text_preview': text[:500] if text else None
            })

    return pou_files

def analyze_meta_structure():
    """Analyze meta file structure to understand object relationships."""
    meta_data = []

    for filename in os.listdir(TEMPLATE_DIR):
        if not filename.endswith('.meta'):
            continue

        filepath = os.path.join(TEMPLATE_DIR, filename)
        result = read_codesys_file(filepath)

        # Try to extract readable info from payload
        payload = result['payload']

        # Look for strings
        strings = []
        text = decode_payload(payload)
        if text:
            # Extract names and types from the text
            import re
            names = re.findall(r'Name="([^"]+)"', text)
            types = re.findall(r'Type="([^"]+)"', text)
            strings = names[:5] + types[:5]

        meta_data.append({
            'filename': filename,
            'guid': filename.replace('.meta', ''),
            'size': len(result['raw']),
            'has_header': result['has_header'],
            'strings': strings
        })

    return meta_data

def main():
    print("="*70)
    print("TEMPLATE2 ANALYSIS")
    print("="*70)

    # Find POU files
    print("\n[1] SEARCHING FOR POU CONTENT...")
    pou_files = find_pou_files()

    if pou_files:
        print(f"\nFound {len(pou_files)} files with POU-related content:\n")
        for pf in pou_files:
            print(f"File: {pf['filename']}")
            print(f"  GUID: {pf['guid']}")
            print(f"  Size: {pf['size']} bytes")
            print(f"  Has CODESYS header: {pf['has_header']}")
            print(f"  Indicators: {pf['indicators']}")
            if pf['text_preview']:
                print(f"  Preview: {pf['text_preview'][:200]}...")
            print()
    else:
        print("\nNo POU files found - this is a blank project template")

    # Analyze meta files
    print("\n[2] META FILE STRUCTURE...")
    meta_data = analyze_meta_structure()

    # Look for interesting meta files (medium size)
    interesting = [m for m in meta_data if 60 <= m['size'] <= 100]
    print(f"\nMeta files with size 60-100 bytes (likely POUs/objects): {len(interesting)}")

    for m in interesting[:5]:
        print(f"\n{m['filename']}")
        print(f"  Size: {m['size']} bytes")
        if m['strings']:
            print(f"  Strings: {m['strings']}")

    # Show file count summary
    print("\n[3] FILE SUMMARY")
    files = os.listdir(TEMPLATE_DIR)
    meta_count = len([f for f in files if f.endswith('.meta')])
    obj_count = len([f for f in files if f.endswith('.object')])
    aux_count = len([f for f in files if f.endswith('.auxiliary')])

    print(f"  .meta files: {meta_count}")
    print(f"  .object files: {obj_count}")
    print(f"  .auxiliary files: {aux_count}")
    print(f"  Total: {len(files)}")

    print("\n" + "="*70)

    return 0

if __name__ == "__main__":
    main()
