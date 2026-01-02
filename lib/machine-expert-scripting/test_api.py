#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script to verify Machine Expert scripting API availability.
Run this in LogicBuilderShell.exe to check what objects are available.
"""

from __future__ import print_function
import sys

print("=" * 60)
print("Machine Expert API Test")
print("=" * 60)

# Check Python version
print("\nPython Version: " + sys.version)

# Check available global objects
print("\n--- Checking Global Objects ---")

# List of expected CODESYS/ME global objects
expected_objects = ['system', 'projects', 'online', 'scriptengine']

for obj_name in expected_objects:
    try:
        obj = eval(obj_name)
        print("[OK] {} = {}".format(obj_name, type(obj).__name__))

        # Try to list methods
        methods = [m for m in dir(obj) if not m.startswith('_')]
        if methods:
            print("     Methods: " + ", ".join(methods[:10]))
            if len(methods) > 10:
                print("     ... and {} more".format(len(methods) - 10))
    except NameError:
        print("[MISSING] {} - not available".format(obj_name))
    except Exception as e:
        print("[ERROR] {} - {}".format(obj_name, str(e)))

# Check if we can access project methods
print("\n--- Testing projects object ---")
try:
    print("projects.open exists: " + str(hasattr(projects, 'open')))
    print("projects.primary exists: " + str(hasattr(projects, 'primary')))
    print("projects.create exists: " + str(hasattr(projects, 'create')))
except NameError:
    print("projects object not available")

# List all globals
print("\n--- All Global Names ---")
global_names = [name for name in dir() if not name.startswith('_')]
print("Count: " + str(len(global_names)))
for name in sorted(global_names):
    print("  " + name)

print("\n" + "=" * 60)
print("Test Complete")
print("=" * 60)
