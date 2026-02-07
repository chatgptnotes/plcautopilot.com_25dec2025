#!/usr/bin/env python3
"""
PLCopen XML Validator
Validates generated XML files for EcoStruxure Machine Expert compliance
"""

import xml.etree.ElementTree as ET
import sys

def validate_plcopen_xml(file_path):
    """
    Validate PLCopen XML file for common issues
    
    Args:
        file_path: Path to XML file to validate
        
    Returns:
        (bool, list): (is_valid, list_of_errors)
    """
    errors = []
    
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
    except ET.ParseError as e:
        return False, [f"XML Parse Error: {e}"]
    except FileNotFoundError:
        return False, [f"File not found: {file_path}"]
    
    # Check namespace
    expected_ns = "http://www.plcopen.org/xml/tc6_0200"
    if root.tag != f"{{{expected_ns}}}project":
        errors.append(f"Invalid root namespace. Expected: {expected_ns}")
    
    # Check required headers
    file_header = root.find(f".//{{{expected_ns}}}fileHeader")
    if file_header is None:
        errors.append("Missing fileHeader")
    else:
        required_attrs = ["companyName", "productName", "productVersion", "creationDateTime"]
        for attr in required_attrs:
            if attr not in file_header.attrib:
                errors.append(f"Missing fileHeader attribute: {attr}")
    
    content_header = root.find(f".//{{{expected_ns}}}contentHeader")
    if content_header is None:
        errors.append("Missing contentHeader")
    else:
        if "name" not in content_header.attrib:
            errors.append("Missing contentHeader name attribute")
    
    # Check coordinate info
    coord_info = root.find(f".//{{{expected_ns}}}coordinateInfo")
    if coord_info is None:
        errors.append("Missing coordinateInfo")
    else:
        required_schemas = ["fbd", "ld", "sfc"]
        for schema in required_schemas:
            schema_elem = coord_info.find(f".//{{{expected_ns}}}{schema}")
            if schema_elem is None:
                errors.append(f"Missing {schema} schema in coordinateInfo")
    
    # Check POU structure
    pous = root.find(f".//{{{expected_ns}}}pous")
    if pous is None:
        errors.append("Missing pous section")
    else:
        pou_elements = pous.findall(f".//{{{expected_ns}}}pou")
        if not pou_elements:
            errors.append("No POU elements found")
        else:
            for pou in pou_elements:
                validate_pou(pou, expected_ns, errors)
    
    # Check instances section
    instances = root.find(f".//{{{expected_ns}}}instances")
    if instances is None:
        errors.append("Missing instances section")
    
    # Check addData section
    add_data = root.find(f".//{{{expected_ns}}}addData")
    if add_data is None:
        errors.append("Missing addData section")
    
    return len(errors) == 0, errors

def validate_pou(pou, ns, errors):
    """Validate POU structure"""
    if "name" not in pou.attrib:
        errors.append("POU missing name attribute")
    
    if "pouType" not in pou.attrib:
        errors.append("POU missing pouType attribute")
    
    # Check interface
    interface = pou.find(f".//{{{ns}}}interface")
    if interface is None:
        errors.append("POU missing interface")
    
    # Check body
    body = pou.find(f".//{{{ns}}}body")
    if body is None:
        errors.append("POU missing body")
    else:
        # Check ladder diagram
        ld = body.find(f".//{{{ns}}}LD")
        if ld is not None:
            validate_ladder_diagram(ld, ns, errors)

def validate_ladder_diagram(ld, ns, errors):
    """Validate ladder diagram structure"""
    
    # Check for power rails
    left_rail = ld.find(f".//{{{ns}}}leftPowerRail")
    if left_rail is None:
        errors.append("Missing leftPowerRail in ladder diagram")
    else:
        if "localId" not in left_rail.attrib:
            errors.append("leftPowerRail missing localId")
    
    # Check all elements have localId
    all_elements = ld.findall(f".//*[@localId]")
    local_ids = set()
    
    for elem in all_elements:
        local_id = elem.get("localId")
        if local_id in local_ids:
            errors.append(f"Duplicate localId: {local_id}")
        local_ids.add(local_id)
    
    # Check function blocks have proper structure
    blocks = ld.findall(f".//{{{ns}}}block")
    for block in blocks:
        validate_function_block(block, ns, errors)
    
    # Check connections reference valid localIds
    connections = ld.findall(f".//{{{ns}}}connection")
    for conn in connections:
        ref_id = conn.get("refLocalId")
        if ref_id and ref_id not in local_ids:
            errors.append(f"Connection references invalid localId: {ref_id}")

def validate_function_block(block, ns, errors):
    """Validate function block structure"""
    
    if "typeName" not in block.attrib:
        errors.append("Function block missing typeName")
    
    type_name = block.get("typeName")
    
    # Check required sections
    input_vars = block.find(f".//{{{ns}}}inputVariables")
    if input_vars is None and type_name in ["TON", "TOF", "CTU", "PID_FIXCYCLE"]:
        errors.append(f"Function block {type_name} missing inputVariables")
    
    inout_vars = block.find(f".//{{{ns}}}inOutVariables")
    if inout_vars is None:
        errors.append(f"Function block {type_name} missing inOutVariables")
    
    output_vars = block.find(f".//{{{ns}}}outputVariables")
    if output_vars is None and type_name in ["TON", "TOF", "CTU", "PID_FIXCYCLE"]:
        errors.append(f"Function block {type_name} missing outputVariables")
    
    # Validate specific function block types
    if type_name == "TON":
        validate_ton_block(block, ns, errors)
    elif type_name == "CTU":
        validate_ctu_block(block, ns, errors)
    elif type_name == "PID_FIXCYCLE":
        validate_pid_block(block, ns, errors)

def validate_ton_block(block, ns, errors):
    """Validate TON timer block"""
    input_vars = block.find(f".//{{{ns}}}inputVariables")
    if input_vars is not None:
        # Check for required inputs
        in_found = False
        pt_found = False
        
        for var in input_vars.findall(f".//{{{ns}}}variable"):
            param = var.get("formalParameter")
            if param == "IN":
                in_found = True
            elif param == "PT":
                pt_found = True
        
        if not in_found:
            errors.append("TON block missing IN parameter")
        if not pt_found:
            errors.append("TON block missing PT parameter")

def validate_ctu_block(block, ns, errors):
    """Validate CTU counter block"""
    input_vars = block.find(f".//{{{ns}}}inputVariables")
    if input_vars is not None:
        required_params = ["CU", "R", "PV"]
        found_params = set()
        
        for var in input_vars.findall(f".//{{{ns}}}variable"):
            param = var.get("formalParameter")
            if param in required_params:
                found_params.add(param)
        
        missing = set(required_params) - found_params
        for param in missing:
            errors.append(f"CTU block missing {param} parameter")

def validate_pid_block(block, ns, errors):
    """Validate PID_FIXCYCLE block"""
    input_vars = block.find(f".//{{{ns}}}inputVariables")
    if input_vars is not None:
        required_params = ["ACTUAL", "SET_POINT", "KP", "TN", "TV", "MANUAL", "RESET", "CYCLE"]
        found_params = set()
        
        for var in input_vars.findall(f".//{{{ns}}}variable"):
            param = var.get("formalParameter")
            if param in required_params:
                found_params.add(param)
        
        missing = set(required_params) - found_params
        for param in missing:
            errors.append(f"PID block missing {param} parameter")
    
    # Check for required addData
    add_data = block.find(f".//{{{ns}}}addData")
    if add_data is None:
        errors.append("PID block missing addData section")

def main():
    """Command line interface"""
    if len(sys.argv) != 2:
        print("Usage: python validate_xml.py <xml_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    is_valid, errors = validate_plcopen_xml(file_path)
    
    if is_valid:
        print(f"[OK] {file_path} is valid PLCopen XML")
        sys.exit(0)
    else:
        print(f"[ERROR] {file_path} has validation errors:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

if __name__ == "__main__":
    main()