#!/usr/bin/env python3
"""
Timer System Generator
Creates sequential timer-based control systems
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
import datetime

def create_timer_system(timer_names, outputs=None, cascade=True):
    """
    Create timer-based sequential control system
    
    Args:
        timer_names: List of timer names ["MixingTimer", "HeatingTimer"]
        outputs: List of output names ["AgitatorMotor", "HeatingElement"]  
        cascade: If True, timers trigger sequentially, if False, parallel
    """
    if outputs is None:
        outputs = [f"Output{i+1}" for i in range(len(timer_names))]
    
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
    ch.set("name", "TimerSystem")
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
    pou.set("name", "TimerSystem")
    pou.set("pouType", "program")
    
    interface = ET.SubElement(pou, "{%s}interface" % ns)
    local_vars = ET.SubElement(interface, "{%s}localVars" % ns)
    
    # Variables
    vars_list = [
        ("StartBtn", "BOOL"),
        ("ProcessActive", "BOOL")
    ]
    
    # Add timer variables
    for timer_name in timer_names:
        vars_list.append((timer_name, "TON"))
        vars_list.append((timer_name.replace("Timer", "Time"), "TIME"))
    
    # Add output variables
    for output in outputs:
        vars_list.append((output, "BOOL"))
    
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
    current_x = 100
    
    # StartBtn Contact
    contact_start = ET.SubElement(ld, "{%s}contact" % ns)
    contact_start.set("localId", str(current_id))
    ET.SubElement(contact_start, "{%s}position" % ns, x=str(current_x), y="100")
    cp_start = ET.SubElement(contact_start, "{%s}connectionPointIn" % ns)
    conn_start = ET.SubElement(cp_start, "{%s}connection" % ns)
    conn_start.set("refLocalId", "0")
    ET.SubElement(contact_start, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact_start, "{%s}variable" % ns).text = "StartBtn"
    
    trigger_ref = str(current_id)
    current_id += 1
    current_x += 200
    
    # Generate timer cascade or parallel structure
    timer_refs = []
    
    for i, timer_name in enumerate(timer_names):
        time_var = timer_name.replace("Timer", "Time")
        
        # Time variable input
        time_input = ET.SubElement(ld, "{%s}inVariable" % ns)
        time_input.set("localId", str(current_id))
        ET.SubElement(time_input, "{%s}position" % ns, x=str(current_x-100), y="120")
        ET.SubElement(time_input, "{%s}connectionPointOut" % ns)
        ET.SubElement(time_input, "{%s}expression" % ns).text = time_var
        time_ref = str(current_id)
        current_id += 1

        # Timer block
        timer = ET.SubElement(ld, "{%s}block" % ns)
        timer.set("localId", str(current_id))
        timer.set("typeName", "TON")
        timer.set("instanceName", timer_name)
        ET.SubElement(timer, "{%s}position" % ns, x=str(current_x), y="80")
        
        in_vars = ET.SubElement(timer, "{%s}inputVariables" % ns)
        
        # IN connection
        v_in = ET.SubElement(in_vars, "{%s}variable" % ns)
        v_in.set("formalParameter", "IN")
        cp_v = ET.SubElement(v_in, "{%s}connectionPointIn" % ns)
        conn_v = ET.SubElement(cp_v, "{%s}connection" % ns)
        conn_v.set("refLocalId", trigger_ref)
        
        # PT connection
        pt_var = ET.SubElement(in_vars, "{%s}variable" % ns)
        pt_var.set("formalParameter", "PT")
        pt_cp = ET.SubElement(pt_var, "{%s}connectionPointIn" % ns)
        pt_conn = ET.SubElement(pt_cp, "{%s}connection" % ns)
        pt_conn.set("refLocalId", time_ref)
        
        ET.SubElement(timer, "{%s}inOutVariables" % ns)
        
        out_vars = ET.SubElement(timer, "{%s}outputVariables" % ns)
        q_var = ET.SubElement(out_vars, "{%s}variable" % ns)
        q_var.set("formalParameter", "Q")
        ET.SubElement(q_var, "{%s}connectionPointOut" % ns)
        
        timer_refs.append(str(current_id))
        current_id += 1
        current_x += 200
        
        # For cascade mode, next timer triggers from previous timer
        if cascade and i < len(timer_names) - 1:
            # ProcessActive contact for next timer
            contact_process = ET.SubElement(ld, "{%s}contact" % ns)
            contact_process.set("localId", str(current_id))
            ET.SubElement(contact_process, "{%s}position" % ns, x=str(current_x), y="100")
            cp_process = ET.SubElement(contact_process, "{%s}connectionPointIn" % ns)
            conn_process = ET.SubElement(cp_process, "{%s}connection" % ns)
            conn_process.set("refLocalId", timer_refs[-1])
            conn_process.set("formalParameter", "Q")
            ET.SubElement(contact_process, "{%s}connectionPointOut" % ns)
            ET.SubElement(contact_process, "{%s}variable" % ns).text = "ProcessActive"
            
            trigger_ref = str(current_id)
            current_id += 1
            current_x += 200

    # Add output coils
    for i, output in enumerate(outputs):
        if i < len(timer_refs):
            coil = ET.SubElement(ld, "{%s}coil" % ns)
            coil.set("localId", str(current_id))
            y_pos = 100 + (i * 100)  # Spread outputs vertically if multiple
            ET.SubElement(coil, "{%s}position" % ns, x=str(current_x), y=str(y_pos))
            cp_coil = ET.SubElement(coil, "{%s}connectionPointIn" % ns)
            conn_coil = ET.SubElement(cp_coil, "{%s}connection" % ns)
            conn_coil.set("refLocalId", timer_refs[i])
            conn_coil.set("formalParameter", "Q")
            ET.SubElement(coil, "{%s}variable" % ns).text = output
            current_id += 1

    # Required structure
    instances = ET.SubElement(project, "{%s}instances" % ns)
    ET.SubElement(instances, "{%s}configurations" % ns)
    
    add_data = ET.SubElement(project, "{%s}addData" % ns)
    data = ET.SubElement(add_data, "{%s}data" % ns)
    data.set("name", "http://www.3s-software.com/plcopenxml/projectstructure")
    data.set("handleUnknown", "discard")
    
    ps = ET.SubElement(data, "ProjectStructure", xmlns="")
    obj = ET.SubElement(ps, "Object")
    obj.set("Name", "TimerSystem")

    return ET.tostring(project, 'utf-8')

if __name__ == "__main__":
    # Example: Create batch mixing timer system
    xml_content = create_timer_system(
        timer_names=["MixingTimer", "HeatingTimer"],
        outputs=["AgitatorMotor", "HeatingElement"],
        cascade=True
    )
    
    # Pretty format and save
    reparsed = minidom.parseString(xml_content)
    pretty_xml = reparsed.toprettyxml(indent="  ")
    
    with open("TimerSystem.xml", "w", encoding="utf-8") as f:
        f.write(pretty_xml)
    
    print("Generated TimerSystem.xml with cascade timers")