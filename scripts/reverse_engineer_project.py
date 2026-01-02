#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Reverse engineer Machine Expert .project binary format
"""

import os
import sys
import struct
import zipfile
import tempfile
import shutil

PROJECT_PATH = r"c:\Users\HP\Documents\Untitled1.project"
OUTPUT_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\reverse_eng"

def extract_project(project_path, output_dir):
    """Extract .project ZIP to directory."""
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)

    with zipfile.ZipFile(project_path, 'r') as zf:
        zf.extractall(output_dir)

    return os.listdir(output_dir)

def parse_codesys_header(data):
    """Parse CODESYS binary header format."""
    # Header: 02 20 09 28 followed by zeros and then length
    if len(data) < 20:
        return None, data

    # First 4 bytes are magic
    magic = data[:4]
    if magic != b'\x02\x20\x09\x28':
        return None, data

    # Next 12 bytes are zeros
    zeros = data[4:16]

    # Next 4 bytes are length (little-endian)
    length = struct.unpack('<I', data[16:20])[0]

    # Rest is payload
    payload = data[20:]

    return {
        'magic': magic.hex(),
        'zeros': zeros.hex(),
        'length': length,
        'payload_size': len(payload)
    }, payload

def analyze_meta_payload(payload):
    """Analyze meta file payload."""
    result = {
        'type': 'unknown',
        'data': []
    }

    # First byte often indicates type
    if len(payload) > 0:
        type_byte = payload[0]

        # Try to parse the structure
        pos = 0
        while pos < len(payload):
            marker = payload[pos]

            # 0x0f often precedes string data
            if marker == 0x0f:
                # Next bytes might be string length
                if pos + 1 < len(payload):
                    str_len = payload[pos + 1]
                    if pos + 2 + str_len <= len(payload):
                        try:
                            string = payload[pos + 2:pos + 2 + str_len].decode('utf-8', errors='ignore')
                            result['data'].append(('string', string))
                            pos += 2 + str_len
                            continue
                        except:
                            pass

            pos += 1

    return result

def analyze_object_payload(payload):
    """Analyze object file payload."""
    result = {
        'format': 'unknown',
        'content': None
    }

    # Check for XML
    if b'<?xml' in payload or b'<\x00?\x00x\x00m\x00l' in payload:
        result['format'] = 'xml'
        try:
            # Try UTF-16
            if b'<\x00?\x00x\x00m\x00l' in payload:
                result['content'] = payload.decode('utf-16-le', errors='ignore')[:500]
            else:
                result['content'] = payload.decode('utf-8', errors='ignore')[:500]
        except:
            pass
    else:
        result['format'] = 'binary'
        # Parse binary structure
        pos = 0
        elements = []
        while pos < min(len(payload), 100):
            if payload[pos] == 0x0f:
                # Might be a string marker
                if pos + 1 < len(payload):
                    length = payload[pos + 1]
                    if length < 100 and pos + 2 + length <= len(payload):
                        try:
                            s = payload[pos + 2:pos + 2 + length].decode('ascii')
                            if s.isprintable():
                                elements.append(s)
                        except:
                            pass
            pos += 1
        result['strings'] = elements

    return result

def find_pou_structure(output_dir):
    """Find how POUs are structured in the project."""
    files = os.listdir(output_dir)

    pou_candidates = []

    for filename in files:
        if not filename.endswith('.object'):
            continue

        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'rb') as f:
            data = f.read()

        # Look for POU-like content
        keywords = [b'POU', b'Program', b'PROGRAM', b'VAR', b'END_VAR',
                    b'Function', b'FUNCTION', b'FunctionBlock']

        for kw in keywords:
            if kw in data:
                header, payload = parse_codesys_header(data)
                pou_candidates.append({
                    'filename': filename,
                    'guid': filename.replace('.object', ''),
                    'size': len(data),
                    'keyword': kw.decode('utf-8', errors='ignore'),
                    'header': header,
                    'format': 'xml' if b'<?xml' in data else 'binary'
                })
                break

    return pou_candidates

def main():
    print("="*70)
    print("MACHINE EXPERT PROJECT REVERSE ENGINEERING")
    print("="*70)

    print(f"\nProject: {PROJECT_PATH}")
    print(f"Output: {OUTPUT_DIR}")

    # Extract project
    print("\n[1] Extracting project...")
    files = extract_project(PROJECT_PATH, OUTPUT_DIR)
    print(f"    Extracted {len(files)} files")

    # Categorize files
    meta_files = [f for f in files if f.endswith('.meta')]
    object_files = [f for f in files if f.endswith('.object')]

    print(f"\n[2] File categories:")
    print(f"    .meta files: {len(meta_files)}")
    print(f"    .object files: {len(object_files)}")

    # Analyze a few meta files
    print("\n[3] META FILE ANALYSIS")
    print("-"*70)

    for meta_file in meta_files[:3]:
        filepath = os.path.join(OUTPUT_DIR, meta_file)
        with open(filepath, 'rb') as f:
            data = f.read()

        header, payload = parse_codesys_header(data)

        print(f"\n{meta_file}")
        print(f"  Size: {len(data)} bytes")
        if header:
            print(f"  Header length field: {header['length']}")
            print(f"  Payload size: {len(payload)}")
        print(f"  Raw hex (first 40): {data[:40].hex()}")

        # Try to find strings
        meta_info = analyze_meta_payload(payload) if header else analyze_meta_payload(data)
        if meta_info['data']:
            print(f"  Strings found: {meta_info['data'][:5]}")

    # Analyze object files
    print("\n[4] OBJECT FILE ANALYSIS")
    print("-"*70)

    for obj_file in object_files[:5]:
        filepath = os.path.join(OUTPUT_DIR, obj_file)
        with open(filepath, 'rb') as f:
            data = f.read()

        header, payload = parse_codesys_header(data)

        print(f"\n{obj_file}")
        print(f"  Size: {len(data)} bytes")
        if header:
            print(f"  Header length field: {header['length']}")

        obj_info = analyze_object_payload(payload) if header else analyze_object_payload(data)
        print(f"  Format: {obj_info['format']}")
        if obj_info.get('content'):
            print(f"  Content preview: {obj_info['content'][:200]}...")
        if obj_info.get('strings'):
            print(f"  Strings: {obj_info['strings'][:10]}")

    # Find POU structures
    print("\n[5] POU STRUCTURE SEARCH")
    print("-"*70)

    pous = find_pou_structure(OUTPUT_DIR)
    if pous:
        for pou in pous:
            print(f"\nPOU Candidate: {pou['filename']}")
            print(f"  GUID: {pou['guid']}")
            print(f"  Size: {pou['size']} bytes")
            print(f"  Keyword: {pou['keyword']}")
            print(f"  Format: {pou['format']}")
    else:
        print("  No POUs found in project (empty project)")

    # Look for the largest object files (usually contain XML POUs)
    print("\n[6] LARGEST OBJECT FILES")
    print("-"*70)

    sizes = []
    for obj_file in object_files:
        filepath = os.path.join(OUTPUT_DIR, obj_file)
        size = os.path.getsize(filepath)
        sizes.append((obj_file, size))

    sizes.sort(key=lambda x: x[1], reverse=True)
    for filename, size in sizes[:5]:
        print(f"  {filename}: {size} bytes")

        # Read and show content type
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'rb') as f:
            data = f.read()

        if b'<?xml' in data or b'<\x00?\x00x\x00m\x00l' in data:
            print(f"    -> XML format")
        else:
            print(f"    -> Binary format")

    print("\n" + "="*70)
    print("ANALYSIS COMPLETE")
    print("="*70)

    return 0

if __name__ == "__main__":
    sys.exit(main())
