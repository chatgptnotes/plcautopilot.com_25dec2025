#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Machine Expert Project Manager Script

This script runs inside LogicBuilderShell.exe (IronPython 2.7)
to automate project manipulation:
- Open template projects
- Import PLCopenXML files (adds POUs)
- Save projects with new names

Usage from LogicBuilderShell:
    execfile('me_project_manager.py')

    # Or with arguments:
    import sys
    sys.argv = ['me_project_manager.py', 'template.project', 'pou.xml', 'output.project']
    execfile('me_project_manager.py')

Usage from command line:
    LogicBuilderShell.exe --noUI --runscript="me_project_manager.py" -- template.project pou.xml output.project
"""

from __future__ import print_function
import sys
import os

# Global objects available in LogicBuilderShell environment:
# - system: System integration (messages, UI control)
# - projects: Project management
# - online: Online access to controller


def log(message):
    """Log message to console and system"""
    print("[ME_PROJECT_MANAGER] " + str(message))
    try:
        system.write_message(0, str(message))  # 0 = Info level
    except:
        pass  # system object may not be available in test mode


def open_project(project_path):
    """
    Open a Machine Expert project file.

    Args:
        project_path: Full path to .project file

    Returns:
        Project object or None on failure
    """
    log("Opening project: " + project_path)

    if not os.path.exists(project_path):
        log("ERROR: Project file not found: " + project_path)
        return None

    try:
        # projects.open() is the CODESYS/ME scripting API method
        projects.open(project_path)
        project = projects.primary
        log("Project opened successfully: " + str(project))
        return project
    except Exception as e:
        log("ERROR opening project: " + str(e))
        return None


def import_plcopen_xml(xml_path, conflict_resolve="Replace"):
    """
    Import PLCopenXML file into the current project.
    This adds POUs from the XML file to the project.

    Args:
        xml_path: Full path to PLCopenXML (.xml) file
        conflict_resolve: How to handle conflicts - "Replace", "Copy", or "Skip"

    Returns:
        True on success, False on failure
    """
    log("Importing PLCopenXML: " + xml_path)

    if not os.path.exists(xml_path):
        log("ERROR: XML file not found: " + xml_path)
        return False

    try:
        project = projects.primary
        if project is None:
            log("ERROR: No project is open")
            return False

        # Import PLCopenXML using import_xml method
        # API signature: import_xml(dataOrPath, import_folder_structure)
        # or: import_xml(conflictResolve, dataOrPath, import_folder_structure)

        imported = False

        # Method 1: Try with ConflictResolve.Replace enum (preferred - replaces existing POUs)
        try:
            # ConflictResolve enum values: Replace, Copy, Skip
            resolve = ConflictResolve.Replace
            project.import_xml(resolve, xml_path, False)
            imported = True
            log("Import successful using import_xml(ConflictResolve.Replace, path, False)")
        except Exception as e1:
            log("Method 1 (Replace) failed: " + str(e1))

            # Method 2: Simple import_xml(path, folder_structure)
            try:
                project.import_xml(xml_path, False)
                imported = True
                log("Import successful using import_xml(path, False)")
            except Exception as e2:
                log("Method 2 (Simple) failed: " + str(e2))

                # Method 3: Try import_native for .export files
                try:
                    project.import_native(xml_path, None, None)
                    imported = True
                    log("Import successful using import_native()")
                except Exception as e3:
                    log("Method 3 failed: " + str(e3))

        if not imported:
            log("ERROR: All import methods failed")
            return False

        return True

    except Exception as e:
        log("ERROR importing PLCopenXML: " + str(e))
        return False


def save_project(output_path=None):
    """
    Save the current project.

    Args:
        output_path: Optional path to save as new file
                     If None, saves to current location

    Returns:
        True on success, False on failure
    """
    try:
        project = projects.primary
        if project is None:
            log("ERROR: No project is open")
            return False

        if output_path:
            log("Saving project as: " + output_path)
            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
            project.save_as(output_path)
        else:
            log("Saving project")
            project.save()

        log("Project saved successfully")
        return True

    except Exception as e:
        log("ERROR saving project: " + str(e))
        return False


def close_project():
    """Close the current project without saving."""
    try:
        project = projects.primary
        if project:
            project.close()
            log("Project closed")
    except Exception as e:
        log("Warning closing project: " + str(e))


def add_pou_from_template(template_project_path, xml_path, output_path, target_model=None):
    """
    Main workflow: Open template, import PLCopenXML, optionally change model, save as new project.

    Args:
        template_project_path: Path to template .project file
        xml_path: Path to PLCopenXML file with POUs to add
        output_path: Path for output .project file
        target_model: Optional target PLC model (e.g., "TM241CE24T")

    Returns:
        True on success, False on failure
    """
    log("=" * 50)
    log("Starting POU import workflow")
    log("Template: " + template_project_path)
    log("XML: " + xml_path)
    log("Output: " + output_path)
    if target_model:
        log("Target Model: " + target_model)
    log("=" * 50)

    success = False

    try:
        # Step 1: Open template project
        project = open_project(template_project_path)
        if not project:
            return False

        # Count POUs before import
        pou_count_before = count_pous()
        log("POUs before import: " + str(pou_count_before))

        # Step 2: Import PLCopenXML (adds POUs)
        import_result = import_plcopen_xml(xml_path)

        # Count POUs after import
        pou_count_after = count_pous()
        log("POUs after import: " + str(pou_count_after))

        if not import_result:
            log("WARNING: Import reported failure, but checking if POUs were added...")

        if pou_count_after <= pou_count_before:
            log("WARNING: No new POUs were added! Import may have failed silently.")
            log("This can happen with Ladder Diagram (LD) format.")
            log("Consider using Structured Text (ST) format or manual PLCopenXML import.")
        else:
            log("SUCCESS: " + str(pou_count_after - pou_count_before) + " new POU(s) added")

        # Step 3: Change device model if specified
        if target_model:
            log("Attempting to change device model...")
            model_changed = change_device_model(target_model)
            if model_changed:
                log("Device model changed to: " + target_model)
            else:
                log("WARNING: Could not change device model (keeping template model)")

        # Step 4: Save as new project
        if not save_project(output_path):
            close_project()
            return False

        # Step 5: Close project
        close_project()

        log("=" * 50)
        log("Workflow completed!")
        log("Output file: " + output_path)
        log("POUs added: " + str(pou_count_after - pou_count_before))
        log("=" * 50)

        success = True

    except Exception as e:
        log("ERROR in workflow: " + str(e))
        close_project()

    return success


def list_project_contents():
    """Debug function to list contents of current project."""
    try:
        project = projects.primary
        if not project:
            log("No project is open")
            return

        log("Project: " + str(project))
        log("Contents:")

        # List all objects in project
        def list_objects(obj, indent=0):
            prefix = "  " * indent
            try:
                log(prefix + "- " + obj.get_name() + " [" + str(type(obj).__name__) + "]")
                for child in obj.get_children():
                    list_objects(child, indent + 1)
            except:
                pass

        list_objects(project)

    except Exception as e:
        log("Error listing contents: " + str(e))


def change_device_model(target_model):
    """
    Change the PLC device model in the current project.

    Args:
        target_model: Target model name (e.g., "TM241CE24T", "TM241CE40T")

    Returns:
        True on success, False on failure
    """
    log("Changing device model to: " + target_model)

    try:
        project = projects.primary
        if not project:
            log("ERROR: No project is open")
            return False

        # Find all devices in the project
        objects = project.get_children(recursive=True)
        device_found = False

        for obj in objects:
            try:
                if obj.is_device:
                    log("Found device: " + obj.get_name())
                    device_found = True

                    # Get current device identification
                    current_id = obj.get_device_identification()
                    log("Current device type: " + str(current_id.type))
                    log("Current device id: " + str(current_id.id))

                    # Search for target device in repository
                    all_devices = device_repository.get_all_devices()
                    target_device = None

                    for device in all_devices:
                        device_name = str(device)
                        # Match by model name (e.g., TM241CE24T)
                        if target_model in device_name:
                            target_device = device
                            log("Found matching device in repository: " + device_name)
                            break

                    if target_device:
                        # Update the device
                        obj.update(device=target_device.device_id)
                        log("Device updated successfully to: " + target_model)
                        return True
                    else:
                        log("WARNING: Target device not found in repository: " + target_model)
                        log("Keeping current device model")
                        return False

            except Exception as e:
                log("Error processing object: " + str(e))
                continue

        if not device_found:
            log("WARNING: No device found in project")
            return False

    except Exception as e:
        log("ERROR changing device model: " + str(e))
        return False

    return False


def count_pous():
    """Count the number of POUs in the current project."""
    try:
        project = projects.primary
        if not project:
            return 0

        count = 0
        objects = project.get_children(recursive=True)
        for obj in objects:
            try:
                obj_type = str(type(obj).__name__)
                if "POU" in obj_type or "Program" in obj_type:
                    count += 1
            except:
                pass
        return count
    except:
        return 0


# Main execution when run as script
if __name__ == "__main__":
    # Parse command line arguments
    # Expected: script.py template.project input.xml output.project [target_model]

    if len(sys.argv) >= 4:
        template_path = sys.argv[1]
        xml_path = sys.argv[2]
        output_path = sys.argv[3]
        target_model = sys.argv[4] if len(sys.argv) >= 5 else None

        log("Arguments received:")
        log("  Template: " + template_path)
        log("  XML: " + xml_path)
        log("  Output: " + output_path)
        if target_model:
            log("  Target Model: " + target_model)

        result = add_pou_from_template(template_path, xml_path, output_path, target_model)

        if result:
            print("SUCCESS")
            sys.exit(0)
        else:
            print("FAILED")
            sys.exit(1)

    elif len(sys.argv) == 2 and sys.argv[1] == "--help":
        print(__doc__)
        sys.exit(0)

    else:
        print("Usage: me_project_manager.py <template.project> <input.xml> <output.project> [target_model]")
        print("       me_project_manager.py --help")
        print("")
        print("Arguments:")
        print("  template.project  - Template .project file to use as base")
        print("  input.xml         - PLCopenXML file with POUs to import")
        print("  output.project    - Output .project file path")
        print("  target_model      - (Optional) Target PLC model, e.g., TM241CE24T")
        print("")
        print("Run inside LogicBuilderShell.exe or via:")
        print("  LogicBuilderShell.exe --noUI --runscript=me_project_manager.py -- args...")
        sys.exit(1)
