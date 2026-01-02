#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Analyze Machine Expert .project file structure
"""

import os
import sys

ANALYSIS_DIR = r"D:\plcautopilot.com_25dec2025 (2)\plcautopilot.com_25dec2025\plc_programs\template_analysis"

def analyze_meta_file(filepath):
    """Analyze a .meta file to understand its binary format."""
    print(f"\n=== {os.path.basename(filepath)} ===")

    with open(filepath, 'rb') as f:
        data = f.read()

    print(f"Size: {len(data)} bytes")
    print(f"Hex: {data[:100].hex()}")

    # Try to decode as UTF-16
    try:
        text = data.decode('utf-16-le')
        print(f"UTF-16-LE: {repr(text[:200])}")
    except:
        pass

    # Try to decode as UTF-8
    try:
        text = data.decode('utf-8')
        print(f"UTF-8: {repr(text[:200])}")
    except:
        pass

    # Look for readable strings
    readable = []
    current = []
    for b in data:
        if 32 <= b <= 126:
            current.append(chr(b))
        else:
            if len(current) >= 4:
                readable.append(''.join(current))
            current = []
    if len(current) >= 4:
        readable.append(''.join(current))

    if readable:
        print(f"Readable strings: {readable[:10]}")

def analyze_object_file(filepath):
    """Analyze a .object file to understand its format."""
    print(f"\n=== {os.path.basename(filepath)} ===")

    with open(filepath, 'rb') as f:
        data = f.read()

    print(f"Size: {len(data)} bytes")

    # Check if it starts with XML declaration
    if b'<?xml' in data[:100]:
        print("Format: XML")
        # Try to find the root element
        try:
            text = data.decode('utf-16-le')
            if '<' in text:
                start = text.find('<')
                end = text.find('>', start) + 1
                print(f"Root: {text[start:end][:200]}")
        except:
            try:
                text = data.decode('utf-8')
                if '<' in text:
                    start = text.find('<')
                    end = text.find('>', start) + 1
                    print(f"Root: {text[start:end][:200]}")
            except:
                pass
    else:
        print("Format: Binary")
        print(f"First 50 bytes hex: {data[:50].hex()}")

def main():
    print("Analyzing Machine Expert project structure...")
    print(f"Directory: {ANALYSIS_DIR}")

    if not os.path.exists(ANALYSIS_DIR):
        print(f"ERROR: Directory not found: {ANALYSIS_DIR}")
        return 1

    files = os.listdir(ANALYSIS_DIR)
    print(f"Total files: {len(files)}")

    # Group files by extension
    meta_files = [f for f in files if f.endswith('.meta')]
    object_files = [f for f in files if f.endswith('.object')]
    aux_files = [f for f in files if f.endswith('.auxiliary')]

    print(f"\n.meta files: {len(meta_files)}")
    print(f".object files: {len(object_files)}")
    print(f".auxiliary files: {len(aux_files)}")

    # Analyze a few meta files
    print("\n" + "="*60)
    print("META FILE ANALYSIS")
    print("="*60)

    for meta_file in meta_files[:5]:
        analyze_meta_file(os.path.join(ANALYSIS_DIR, meta_file))

    # Analyze a few object files
    print("\n" + "="*60)
    print("OBJECT FILE ANALYSIS")
    print("="*60)

    for obj_file in object_files[:5]:
        analyze_object_file(os.path.join(ANALYSIS_DIR, obj_file))

    # Look for existing POUs
    print("\n" + "="*60)
    print("SEARCHING FOR POU PATTERNS")
    print("="*60)

    for obj_file in object_files:
        filepath = os.path.join(ANALYSIS_DIR, obj_file)
        with open(filepath, 'rb') as f:
            data = f.read()

        # Check for POU indicators
        if b'POU' in data or b'Program' in data or b'PROGRAM' in data:
            print(f"\n{obj_file}: Contains POU-related content")
            # Try to extract more info
            try:
                text = data.decode('utf-16-le', errors='ignore')
                if 'Name=' in text:
                    idx = text.find('Name=')
                    print(f"  Name found: {text[idx:idx+100]}")
            except:
                pass

    return 0

if __name__ == "__main__":
    sys.exit(main())
