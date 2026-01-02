#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test opening a project and exploring available methods for PLCopenXML import.
"""

from __future__ import print_function
import sys

print("=" * 60)
print("Test: Open Project and Explore PLCopenXML Import")
print("=" * 60)

# Path to test project (using copy to avoid lock issues)
project_path = r"c:\Users\HP\Documents\Test_copy.project"

print("\n1. Opening project: " + project_path)
try:
    projects.open(project_path)
    print("   [OK] Project opened")
except Exception as e:
    print("   [ERROR] " + str(e))
    sys.exit(1)

print("\n2. Getting primary project")
try:
    proj = projects.primary
    print("   [OK] Project name: " + str(proj.name if hasattr(proj, 'name') else proj))
    print("   [OK] Project type: " + str(type(proj).__name__))
except Exception as e:
    print("   [ERROR] " + str(e))
    sys.exit(1)

print("\n3. Exploring project methods")
try:
    methods = [m for m in dir(proj) if not m.startswith('_')]
    print("   Available methods (" + str(len(methods)) + "):")
    for m in sorted(methods):
        print("      - " + m)
except Exception as e:
    print("   [ERROR] " + str(e))

print("\n4. Looking for import methods")
import_methods = ['import_plcopenxml', 'import_xml', 'import_native', 'import_', 'Import']
for method_name in import_methods:
    try:
        if hasattr(proj, method_name):
            print("   [FOUND] proj." + method_name)
        else:
            # Check if it contains the substring
            matching = [m for m in dir(proj) if method_name.lower() in m.lower()]
            if matching:
                print("   [PARTIAL] Methods containing '" + method_name + "': " + ", ".join(matching))
    except:
        pass

print("\n5. Exploring project children/contents")
try:
    # Try different methods to get children
    if hasattr(proj, 'get_children'):
        children = proj.get_children()
        print("   Children via get_children(): " + str(len(children)))
        for child in children[:5]:
            print("      - " + str(child))

    if hasattr(proj, 'find'):
        apps = proj.find("Application")
        print("   Applications found: " + str(len(apps)))
        for app in apps:
            print("      - " + str(app))
            # Check app methods
            app_methods = [m for m in dir(app) if 'import' in m.lower()]
            if app_methods:
                print("        Import methods: " + ", ".join(app_methods))
except Exception as e:
    print("   [ERROR] " + str(e))

print("\n6. Checking system.dump_scripting_api()")
try:
    # This may provide full API documentation
    print("   Dumping API to: me_api_dump.txt")
    system.dump_scripting_api(r"c:\Users\HP\Documents\me_api_dump.txt")
    print("   [OK] API dumped - check the file for full documentation")
except Exception as e:
    print("   [ERROR] " + str(e))

print("\n7. Closing project")
try:
    proj.close()
    print("   [OK] Project closed")
except Exception as e:
    print("   [ERROR] " + str(e))

print("\n" + "=" * 60)
print("Test Complete")
print("=" * 60)
