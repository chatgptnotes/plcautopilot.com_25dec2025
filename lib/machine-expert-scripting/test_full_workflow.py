#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test full workflow: Open template, import PLCopenXML, save as new project.
"""

from __future__ import print_function
import sys
import os

print("=" * 60)
print("Test: Full Import Workflow")
print("=" * 60)

# Paths
template_path = r"c:\Users\HP\Documents\Test_copy.project"
xml_path = r"c:\Users\HP\Documents\test_pou.xml"
output_path = r"c:\Users\HP\Documents\Test_with_pou.project"

# Remove output file if exists
if os.path.exists(output_path):
    os.remove(output_path)
    print("Removed existing output file")

print("\n1. Opening template: " + template_path)
try:
    projects.open(template_path)
    proj = projects.primary
    print("   [OK] Project opened: " + str(proj))
except Exception as e:
    print("   [FAILED] " + str(e))
    sys.exit(1)

print("\n2. Importing PLCopenXML: " + xml_path)
try:
    # Try different import methods
    imported = False

    # Method 1: Simple import_xml
    try:
        proj.import_xml(xml_path, False)
        imported = True
        print("   [OK] import_xml(path, False) succeeded")
    except Exception as e1:
        print("   Method 1 failed: " + str(e1))

        # Method 2: With ConflictResolve
        try:
            proj.import_xml(ConflictResolve.Replace, xml_path, False)
            imported = True
            print("   [OK] import_xml(ConflictResolve.Replace, path, False) succeeded")
        except Exception as e2:
            print("   Method 2 failed: " + str(e2))

    if not imported:
        print("   [FAILED] All import methods failed")
        proj.close()
        sys.exit(1)

except Exception as e:
    print("   [FAILED] " + str(e))
    proj.close()
    sys.exit(1)

print("\n3. Saving as: " + output_path)
try:
    proj.save_as(output_path)
    print("   [OK] Project saved")
except Exception as e:
    print("   [FAILED] " + str(e))
    proj.close()
    sys.exit(1)

print("\n4. Closing project")
try:
    proj.close()
    print("   [OK] Project closed")
except Exception as e:
    print("   [WARNING] " + str(e))

print("\n5. Verifying output file")
if os.path.exists(output_path):
    size = os.path.getsize(output_path)
    print("   [OK] Output file created: " + str(size) + " bytes")
else:
    print("   [FAILED] Output file not found")
    sys.exit(1)

print("\n" + "=" * 60)
print("SUCCESS! Workflow completed.")
print("Output: " + output_path)
print("=" * 60)
