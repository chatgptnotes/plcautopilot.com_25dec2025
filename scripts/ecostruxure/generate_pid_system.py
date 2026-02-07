#!/usr/bin/env python3
"""
PID System Generator
Creates standalone PID temperature control systems
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
import datetime

def create_pid_system(pid_name="TempController", direct_tuning=True, tuning_params=None):
    """
    Create PID temperature control system
    
    Args:
        pid_name: Instance name for PID block
        direct_tuning: Use direct values (True) or variables (False) for Kp, Tn, Tv
        tuning_params: Dict with Kp, Tn, Tv values (default: {"Kp": 1.5, "Tn": 10.0, "Tv": 2.0})
    """
    if tuning_params is None:
        tuning_params = {"Kp": 1.5, "Tn": 10.0, "Tv": 2.0}
    
    ns = "http://www.plcopen.org/xml/tc6_0200"
    ET.register_namespace("", ns)
    project = ET.Element("{%s}project" % ns)
    
    # Headers
    fh = ET.SubElement(project, "{%s}fileHeader" % ns)
    fh.set("companyName", "PLCArchitect")
    fh.set("productName", "Machine Expert Logic Builder")
    fh.set("productVersion", "V19.2.3.0")
    fh.set("creationDateTime", datetime.datetime.now().isoformat())
    
    ch = ET.SubElement(project, "{%s}contentHeader" % ns)
    ch.set("name", "PIDSystem")
    ch.set("version", "1.0.0.0")
    
    coord = ET.SubElement(ch, "{%s}coordinateInfo" % ns)
    for schema in ["fbd", "ld", "sfc"]:
        s_el = ET.SubElement(coord, "{%s}%s" % (ns, schema))
        ET.SubElement(s_el, "{%s}scaling" % ns, x="1", y="1")
    
    # Types
    types = ET.SubElement(project, "{%s}types" % ns)
    ET.SubElement(types, "{%s}dataTypes" % ns)
    pous = ET.SubElement(types, "{%s}pous" % ns)
    
    # Create POU
    pou = ET.SubElement(pous, "{%s}pou" % ns)
    pou.set("name", "PIDSystem")
    pou.set("pouType", "program")
    
    interface = ET.SubElement(pou, "{%s}interface" % ns)
    local_vars = ET.SubElement(interface, "{%s}localVars" % ns)
    
    # Variables
    vars_list = [
        # Process variables
        ("actual_value", "REAL"),
        ("setpoint", "REAL"),
        ("control_output", "REAL"),
        
        # Control variables
        ("PID_Enable", "BOOL"),
        ("Manual_Mode", "BOOL"),
        ("Reset_PID", "BOOL"),
        
        # PID instance
        (pid_name, "PID_FIXCYCLE"),
        
        # PID parameters
        ("y_manual", "REAL"),
        ("y_offset", "REAL"),
        ("y_min", "REAL"),
        ("y_max", "REAL"),
        ("cycle_time", "REAL"),
        
        # Status outputs
        ("limits_active", "BOOL"),
        ("overflow", "BOOL")
    ]
    
    # Add tuning parameter variables if not using direct values
    if not direct_tuning:
        vars_list.extend([
            ("Kp", "REAL"),
            ("Tn", "REAL"), 
            ("Tv", "REAL")
        ])
    
    # Create variables
    for v_name, v_type in vars_list:
        var = ET.SubElement(local_vars, "{%s}variable" % ns)
        var.set("name", v_name)
        t_el = ET.SubElement(var, "{%s}type" % ns)
        if v_type in ["BOOL", "REAL", "INT", "TIME"]:
            ET.SubElement(t_el, "{%s}%s" % (ns, v_type))
        else:
            der = ET.SubElement(t_el, "{%s}derived" % ns)
            der.set("name", v_type)

    # Body
    body = ET.SubElement(pou, "{%s}body" % ns)
    ld = ET.SubElement(body, "{%s}LD" % ns)
    
    # Power Rail
    rail = ET.SubElement(ld, "{%s}leftPowerRail" % ns)
    rail.set("localId", "0")
    ET.SubElement(rail, "{%s}position" % ns, x="0", y="0")
    ET.SubElement(rail, "{%s}connectionPointOut" % ns, formalParameter="none")

    current_id = 1
    
    # PID Enable contact
    contact_enable = ET.SubElement(ld, "{%s}contact" % ns)
    contact_enable.set("localId", str(current_id))
    ET.SubElement(contact_enable, "{%s}position" % ns, x="100", y="200")
    cp_enable = ET.SubElement(contact_enable, "{%s}connectionPointIn" % ns)
    conn_enable = ET.SubElement(cp_enable, "{%s}connection" % ns)
    conn_enable.set("refLocalId", "0")
    ET.SubElement(contact_enable, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact_enable, "{%s}variable" % ns).text = "PID_Enable"
    current_id += 1

    # Input variables for PID parameters
    pid_input_refs = {}
    
    # Actual value
    actual_var = ET.SubElement(ld, "{%s}inVariable" % ns)
    actual_var.set("localId", str(current_id))
    ET.SubElement(actual_var, "{%s}position" % ns, x="0", y="0")
    ET.SubElement(actual_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(actual_var, "{%s}expression" % ns).text = "actual_value"
    pid_input_refs["ACTUAL"] = str(current_id)
    current_id += 1
    
    # Setpoint
    setpoint_var = ET.SubElement(ld, "{%s}inVariable" % ns)
    setpoint_var.set("localId", str(current_id))
    ET.SubElement(setpoint_var, "{%s}position" % ns, x="0", y="0")
    ET.SubElement(setpoint_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(setpoint_var, "{%s}expression" % ns).text = "setpoint"
    pid_input_refs["SET_POINT"] = str(current_id)
    current_id += 1
    
    # Tuning parameters
    if direct_tuning:
        # Direct values
        for param, value in [("KP", tuning_params["Kp"]), ("TN", tuning_params["Tn"]), ("TV", tuning_params["Tv"])]:
            param_var = ET.SubElement(ld, "{%s}inVariable" % ns)
            param_var.set("localId", str(current_id))
            ET.SubElement(param_var, "{%s}position" % ns, x="0", y="0")
            ET.SubElement(param_var, "{%s}connectionPointOut" % ns)
            ET.SubElement(param_var, "{%s}expression" % ns).text = str(value)
            pid_input_refs[param] = str(current_id)
            current_id += 1
    else:
        # Variable references
        for param, var_name in [("KP", "Kp"), ("TN", "Tn"), ("TV", "Tv")]:
            param_var = ET.SubElement(ld, "{%s}inVariable" % ns)
            param_var.set("localId", str(current_id))
            ET.SubElement(param_var, "{%s}position" % ns, x="0", y="0")
            ET.SubElement(param_var, "{%s}connectionPointOut" % ns)
            ET.SubElement(param_var, "{%s}expression" % ns).text = var_name
            pid_input_refs[param] = str(current_id)
            current_id += 1
    
    # Other PID parameters
    other_params = [
        ("Y_MANUAL", "y_manual"),
        ("Y_OFFSET", "y_offset"),
        ("Y_MIN", "y_min"),
        ("Y_MAX", "y_max"),
        ("CYCLE", "cycle_time")
    ]
    
    for param, var_name in other_params:
        param_var = ET.SubElement(ld, "{%s}inVariable" % ns)
        param_var.set("localId", str(current_id))
        ET.SubElement(param_var, "{%s}position" % ns, x="0", y="0")
        ET.SubElement(param_var, "{%s}connectionPointOut" % ns)
        ET.SubElement(param_var, "{%s}expression" % ns).text = var_name
        pid_input_refs[param] = str(current_id)
        current_id += 1
    
    # Manual mode contact
    contact_manual = ET.SubElement(ld, "{%s}contact" % ns)
    contact_manual.set("localId", str(current_id))
    contact_manual.set("negated", "false")
    contact_manual.set("storage", "none")
    contact_manual.set("edge", "none")
    ET.SubElement(contact_manual, "{%s}position" % ns, x="0", y="0")
    cp_manual = ET.SubElement(contact_manual, "{%s}connectionPointIn" % ns)
    conn_manual = ET.SubElement(cp_manual, "{%s}connection" % ns)
    conn_manual.set("refLocalId", "0")
    ET.SubElement(contact_manual, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact_manual, "{%s}variable" % ns).text = "Manual_Mode"
    pid_input_refs["MANUAL"] = str(current_id)
    current_id += 1
    
    # Reset contact
    contact_reset = ET.SubElement(ld, "{%s}contact" % ns)
    contact_reset.set("localId", str(current_id))
    contact_reset.set("negated", "false")
    contact_reset.set("storage", "none")
    contact_reset.set("edge", "none")
    ET.SubElement(contact_reset, "{%s}position" % ns, x="0", y="0")
    cp_reset = ET.SubElement(contact_reset, "{%s}connectionPointIn" % ns)
    conn_reset = ET.SubElement(cp_reset, "{%s}connection" % ns)
    conn_reset.set("refLocalId", "0")
    ET.SubElement(contact_reset, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact_reset, "{%s}variable" % ns).text = "Reset_PID"
    pid_input_refs["RESET"] = str(current_id)
    current_id += 1
    
    # PID_FIXCYCLE Block
    pid_block = ET.SubElement(ld, "{%s}block" % ns)
    pid_block.set("localId", str(current_id))
    pid_block.set("typeName", "PID_FIXCYCLE")
    pid_block.set("instanceName", pid_name)
    ET.SubElement(pid_block, "{%s}position" % ns, x="300", y="200")
    
    # PID Input variables
    pid_in_vars = ET.SubElement(pid_block, "{%s}inputVariables" % ns)
    
    # Connect all PID parameters
    for param_name, ref_id in pid_input_refs.items():
        pid_var = ET.SubElement(pid_in_vars, "{%s}variable" % ns)
        pid_var.set("formalParameter", param_name)
        pid_cp = ET.SubElement(pid_var, "{%s}connectionPointIn" % ns)
        pid_conn = ET.SubElement(pid_cp, "{%s}connection" % ns)
        pid_conn.set("refLocalId", ref_id)
    
    ET.SubElement(pid_block, "{%s}inOutVariables" % ns)
    
    # PID Output variables
    pid_out_vars = ET.SubElement(pid_block, "{%s}outputVariables" % ns)
    
    # Y output (control value) - NO expression element
    y_var = ET.SubElement(pid_out_vars, "{%s}variable" % ns)
    y_var.set("formalParameter", "Y")
    ET.SubElement(y_var, "{%s}connectionPointOut" % ns)
    
    # Status outputs WITH expression elements
    limits_var = ET.SubElement(pid_out_vars, "{%s}variable" % ns)
    limits_var.set("formalParameter", "LIMITS_ACTIVE")
    limits_cp = ET.SubElement(limits_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(limits_cp, "{%s}expression" % ns).text = "limits_active"
    
    overflow_var = ET.SubElement(pid_out_vars, "{%s}variable" % ns)
    overflow_var.set("formalParameter", "OVERFLOW")
    overflow_cp = ET.SubElement(overflow_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(overflow_cp, "{%s}expression" % ns).text = "overflow"
    
    # PID addData (required for function blocks)
    pid_add_data = ET.SubElement(pid_block, "{%s}addData" % ns)
    pid_data = ET.SubElement(pid_add_data, "{%s}data" % ns)
    pid_data.set("name", "http://www.3s-software.com/plcopenxml/fbdcalltype")
    pid_data.set("handleUnknown", "implementation")
    pid_call_type = ET.SubElement(pid_data, "CallType", xmlns="")
    pid_call_type.text = "functionblock"
    
    pid_ref = str(current_id)
    current_id += 1
    
    # Output variable for control value
    output_var = ET.SubElement(ld, "{%s}outVariable" % ns)
    output_var.set("localId", str(current_id))
    ET.SubElement(output_var, "{%s}position" % ns, x="600", y="220")
    output_cp = ET.SubElement(output_var, "{%s}connectionPointIn" % ns)
    output_conn = ET.SubElement(output_cp, "{%s}connection" % ns)
    output_conn.set("refLocalId", pid_ref)
    output_conn.set("formalParameter", "Y")
    ET.SubElement(output_var, "{%s}expression" % ns).text = "control_output"
    current_id += 1
    
    # Right Power Rail (required for PID)
    right_rail = ET.SubElement(ld, "{%s}rightPowerRail" % ns)
    right_rail.set("localId", "2147483646")
    ET.SubElement(right_rail, "{%s}position" % ns, x="0", y="0")
    right_cp = ET.SubElement(right_rail, "{%s}connectionPointIn" % ns)
    right_conn = ET.SubElement(right_cp, "{%s}connection" % ns)
    right_conn.set("refLocalId", pid_ref)
    right_conn.set("formalParameter", "")

    # Required structure
    instances = ET.SubElement(project, "{%s}instances" % ns)
    ET.SubElement(instances, "{%s}configurations" % ns)
    
    add_data = ET.SubElement(project, "{%s}addData" % ns)
    data = ET.SubElement(add_data, "{%s}data" % ns)
    data.set("name", "http://www.3s-software.com/plcopenxml/projectstructure")
    data.set("handleUnknown", "discard")
    
    ps = ET.SubElement(data, "ProjectStructure", xmlns="")
    obj = ET.SubElement(ps, "Object")
    obj.set("Name", "PIDSystem")

    return ET.tostring(project, 'utf-8')

if __name__ == "__main__":
    # Example: Create temperature controller with direct tuning
    xml_content = create_pid_system(
        pid_name="TempController",
        direct_tuning=True,
        tuning_params={"Kp": 1.5, "Tn": 10.0, "Tv": 2.0}
    )
    
    # Pretty format and save
    reparsed = minidom.parseString(xml_content)
    pretty_xml = reparsed.toprettyxml(indent="  ")
    
    with open("PIDSystem.xml", "w", encoding="utf-8") as f:
        f.write(pretty_xml)
    
    print("Generated PIDSystem.xml with direct tuning values")