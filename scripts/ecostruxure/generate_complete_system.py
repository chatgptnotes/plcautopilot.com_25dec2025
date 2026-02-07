#!/usr/bin/env python3
"""
Complete System Generator for EcoStruxure Machine Expert
Generates PLCopen XML for various industrial automation patterns
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
import datetime

def create_automation_system(system_type="batch_control", include_timers=True, include_counters=True, include_pid=True, pid_tuning=None):
    """
    Create complete automation system XML
    
    Args:
        system_type: "batch_control", "conveyor", "hvac", "packaging"
        include_timers: Add timer-based sequential control
        include_counters: Add batch counting functionality  
        include_pid: Add PID temperature control
        pid_tuning: Dict with Kp, Tn, Tv values
    """
    if pid_tuning is None:
        pid_tuning = {"Kp": 1.5, "Tn": 10.0, "Tv": 2.0}
    
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
    ch.set("name", f"{system_type.title()}System")
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
    pou.set("name", f"{system_type.title()}System")
    pou.set("pouType", "program")
    
    interface = ET.SubElement(pou, "{%s}interface" % ns)
    local_vars = ET.SubElement(interface, "{%s}localVars" % ns)
    
    # Build variable list based on options (now includes I/O addresses)
    vars_list = get_system_variables(system_type, include_timers, include_counters, include_pid)
    
    # Create variables with I/O addresses
    for var_info in vars_list:
        if len(var_info) == 3:
            v_name, v_type, v_address = var_info
        else:
            v_name, v_type = var_info
            v_address = None
        
        var = ET.SubElement(local_vars, "{%s}variable" % ns)
        var.set("name", v_name)
        
        # Add I/O address if specified
        if v_address:
            var.set("address", v_address)
        
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

    # Build ladder logic based on system type and options
    current_id = 1
    
    # ALWAYS add base control logic for the system type
    current_id = add_base_control_logic(ld, ns, current_id, system_type)
    
    if include_timers:
        current_id = add_timer_section(ld, ns, current_id, system_type)
    
    if include_counters:
        current_id = add_counter_section(ld, ns, current_id, include_timers)
    
    if include_pid:
        current_id = add_pid_section(ld, ns, current_id, pid_tuning)
    
    # Required structure
    instances = ET.SubElement(project, "{%s}instances" % ns)
    ET.SubElement(instances, "{%s}configurations" % ns)
    
    add_data = ET.SubElement(project, "{%s}addData" % ns)
    data = ET.SubElement(add_data, "{%s}data" % ns)
    data.set("name", "http://www.3s-software.com/plcopenxml/projectstructure")
    data.set("handleUnknown", "discard")
    
    ps = ET.SubElement(data, "ProjectStructure", xmlns="")
    obj = ET.SubElement(ps, "Object")
    obj.set("Name", f"{system_type.title()}System")

    return ET.tostring(project, 'utf-8')

def get_system_variables(system_type, include_timers, include_counters, include_pid):
    """Get variable list based on system configuration with M241 I/O addresses"""
    
    if system_type == "conveyor":
        # Conveyor system with proper I/O mapping for M241 (byte.bit format, 0-7 per byte)
        vars_list = [
            # Digital Inputs - Byte 0: %IX0.0-%IX0.7, Byte 1: %IX1.0-%IX1.7
            ("StartBtn", "BOOL", "%IX0.0"),           # Start pushbutton
            ("StopBtn", "BOOL", "%IX0.1"),            # Stop pushbutton  
            ("EmergencyStop", "BOOL", "%IX0.2"),      # E-Stop (NC)
            ("LoadStation", "BOOL", "%IX0.3"),        # Load sensor
            ("UnloadStation", "BOOL", "%IX0.4"),      # Unload sensor
            ("MotorOverload", "BOOL", "%IX0.5"),      # Motor overload contact
            ("ProxSensor1", "BOOL", "%IX0.6"),        # Proximity sensor 1
            ("ProxSensor2", "BOOL", "%IX0.7"),        # Proximity sensor 2
            ("SafetyGate", "BOOL", "%IX1.0"),         # Safety gate interlock
            # Digital Outputs - Byte 0: %QX0.0-%QX0.7
            ("ConveyorMotor", "BOOL", "%QX0.0"),      # Main conveyor motor
            ("ProcessActive", "BOOL", "%QX0.1"),      # System running indicator
            ("AlarmLight", "BOOL", "%QX0.2"),         # Alarm indicator
            ("ReadyLight", "BOOL", "%QX0.3"),         # Ready indicator
        ]
    elif system_type == "batch_control":
        vars_list = [
            # Digital Inputs (byte.bit format)
            ("StartBtn", "BOOL", "%IX0.0"),
            ("StopBtn", "BOOL", "%IX0.1"),
            ("EmergencyStop", "BOOL", "%IX0.2"),
            ("LevelHigh", "BOOL", "%IX0.3"),
            ("LevelLow", "BOOL", "%IX0.4"),
            ("TempSwitch", "BOOL", "%IX0.5"),
            ("PressureSwitch", "BOOL", "%IX0.6"),
            ("DrainConfirm", "BOOL", "%IX0.7"),
            ("InletValveFB", "BOOL", "%IX1.0"),       # Byte 1 starts here
            # Digital Outputs
            ("AgitatorMotor", "BOOL", "%QX0.0"),
            ("HeatingElement", "BOOL", "%QX0.1"),
            ("CoolingValve", "BOOL", "%QX0.2"),
            ("ProcessActive", "BOOL", "%QX0.3"),
            ("InletValve", "BOOL", "%QX0.4"),
            ("DrainValve", "BOOL", "%QX0.5"),
            ("AlarmHorn", "BOOL", "%QX0.6"),
        ]
    elif system_type == "hvac":
        vars_list = [
            # Digital Inputs (byte.bit format)
            ("StartBtn", "BOOL", "%IX0.0"),
            ("StopBtn", "BOOL", "%IX0.1"),
            ("TempHighAlarm", "BOOL", "%IX0.2"),
            ("TempLowAlarm", "BOOL", "%IX0.3"),
            ("FilterDirty", "BOOL", "%IX0.4"),
            ("FanRunning", "BOOL", "%IX0.5"),
            ("DamperOpen", "BOOL", "%IX0.6"),
            ("FireAlarm", "BOOL", "%IX0.7"),
            # Digital Outputs
            ("HeatingElement", "BOOL", "%QX0.0"),
            ("CoolingElement", "BOOL", "%QX0.1"),
            ("Fan", "BOOL", "%QX0.2"),
            ("ProcessActive", "BOOL", "%QX0.3"),
            ("Damper", "BOOL", "%QX0.4"),
            ("AlarmOut", "BOOL", "%QX0.5"),
        ]
    else:
        # Generic system (byte.bit format)
        vars_list = [
            ("StartBtn", "BOOL", "%IX0.0"),
            ("StopBtn", "BOOL", "%IX0.1"),
            ("Sensor1", "BOOL", "%IX0.2"),
            ("ProcessActive", "BOOL", "%QX0.0"),
            ("Output1", "BOOL", "%QX0.1"),
        ]
    
    # Timer variables
    if include_timers:
        if system_type == "batch_control":
            vars_list.extend([
                ("MixingTimer", "TON"),
                ("HeatingTimer", "TON"),
                ("MixingTime", "TIME"),
                ("HeatingTime", "TIME")
            ])
        else:
            vars_list.extend([
                ("ProcessTimer", "TON"),
                ("ProcessTime", "TIME")
            ])
    
    # Counter variables
    if include_counters:
        vars_list.extend([
            ("BatchCounter", "CTU"),
            ("CounterReset", "BOOL"),
            ("BatchTarget", "INT"),
            ("BatchComplete", "BOOL")
        ])
    
    # PID variables
    if include_pid:
        vars_list.extend([
            ("TempController", "PID_FIXCYCLE"),
            ("actual_temp", "REAL"),
            ("setpoint_temp", "REAL"),
            ("Manual", "BOOL"),
            ("reset", "BOOL"),
            ("y_manual", "REAL"),
            ("y_offset", "REAL"),
            ("y_min", "REAL"),
            ("y_max", "REAL"),
            ("cycle", "REAL"),
            ("limits_active", "BOOL"),
            ("Overflow", "BOOL"),
            ("heater_output", "REAL")
        ])
    
    return vars_list

def add_contact(ld, ns, local_id, var_name, ref_id, x, y, negated=False):
    """Helper to add a contact element"""
    contact = ET.SubElement(ld, "{%s}contact" % ns)
    contact.set("localId", str(local_id))
    if negated:
        contact.set("negated", "true")
    ET.SubElement(contact, "{%s}position" % ns, x=str(x), y=str(y))
    cp_in = ET.SubElement(contact, "{%s}connectionPointIn" % ns)
    conn = ET.SubElement(cp_in, "{%s}connection" % ns)
    conn.set("refLocalId", ref_id)
    ET.SubElement(contact, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact, "{%s}variable" % ns).text = var_name
    return local_id + 1

def add_coil(ld, ns, local_id, var_name, ref_id, x, y):
    """Helper to add a coil element"""
    coil = ET.SubElement(ld, "{%s}coil" % ns)
    coil.set("localId", str(local_id))
    ET.SubElement(coil, "{%s}position" % ns, x=str(x), y=str(y))
    cp_in = ET.SubElement(coil, "{%s}connectionPointIn" % ns)
    conn = ET.SubElement(cp_in, "{%s}connection" % ns)
    conn.set("refLocalId", ref_id)
    ET.SubElement(coil, "{%s}variable" % ns).text = var_name
    return local_id + 1

def add_base_control_logic(ld, ns, start_id, system_type):
    """Add base control logic for all system types - ALWAYS RUNS - Uses ALL declared variables"""
    current_id = start_id
    
    if system_type == "conveyor":
        # ===== CONVEYOR COMPLETE CONTROL LOGIC =====
        
        # Rung 1: Start/Stop with Safety Interlocks
        # StartBtn AND NOT StopBtn AND NOT EmergencyStop AND SafetyGate -> ProcessActive
        
        # StartBtn NO Contact
        current_id = add_contact(ld, ns, current_id, "StartBtn", "0", 100, 100, False)
        start_id_ref = current_id - 1
        
        # StopBtn NC Contact
        current_id = add_contact(ld, ns, current_id, "StopBtn", str(start_id_ref), 200, 100, True)
        
        # EmergencyStop NC Contact
        current_id = add_contact(ld, ns, current_id, "EmergencyStop", str(current_id-1), 300, 100, True)
        
        # SafetyGate NO Contact (must be closed/true to run)
        current_id = add_contact(ld, ns, current_id, "SafetyGate", str(current_id-1), 400, 100, False)
        
        # ProcessActive Coil
        current_id = add_coil(ld, ns, current_id, "ProcessActive", str(current_id-1), 550, 100)
        
        # Rung 2: Motor Control with Overload Protection
        # ProcessActive AND NOT MotorOverload -> ConveyorMotor
        
        current_id = add_contact(ld, ns, current_id, "ProcessActive", "0", 100, 200, False)
        current_id = add_contact(ld, ns, current_id, "MotorOverload", str(current_id-1), 250, 200, True)
        current_id = add_coil(ld, ns, current_id, "ConveyorMotor", str(current_id-1), 450, 200)
        
        # Rung 3: Load/Unload Station Logic
        # LoadStation AND ConveyorMotor -> UnloadStation
        
        current_id = add_contact(ld, ns, current_id, "LoadStation", "0", 100, 300, False)
        current_id = add_contact(ld, ns, current_id, "ConveyorMotor", str(current_id-1), 250, 300, False)
        current_id = add_coil(ld, ns, current_id, "UnloadStation", str(current_id-1), 450, 300)
        
        # Rung 4: Proximity Sensor Logic
        # ProxSensor1 OR ProxSensor2 -> (internal flag, reuse for demo)
        # For simplicity: ProxSensor1 -> ReadyLight (product detected = ready)
        
        current_id = add_contact(ld, ns, current_id, "ProxSensor1", "0", 100, 400, False)
        current_id = add_contact(ld, ns, current_id, "ProcessActive", str(current_id-1), 250, 400, False)
        current_id = add_coil(ld, ns, current_id, "ReadyLight", str(current_id-1), 450, 400)
        
        # Rung 5: Alarm Logic
        # EmergencyStop OR MotorOverload -> AlarmLight
        
        current_id = add_contact(ld, ns, current_id, "EmergencyStop", "0", 100, 500, False)
        current_id = add_coil(ld, ns, current_id, "AlarmLight", str(current_id-1), 300, 500)
        
        # Rung 6: MotorOverload also triggers Alarm (separate rung for clarity)
        current_id = add_contact(ld, ns, current_id, "MotorOverload", "0", 100, 600, False)
        current_id = add_coil(ld, ns, current_id, "AlarmLight", str(current_id-1), 300, 600)
        
        # Rung 7: ProxSensor2 - Product at end triggers unload sequence
        current_id = add_contact(ld, ns, current_id, "ProxSensor2", "0", 100, 700, False)
        current_id = add_contact(ld, ns, current_id, "ConveyorMotor", str(current_id-1), 250, 700, False)
        current_id = add_coil(ld, ns, current_id, "UnloadStation", str(current_id-1), 450, 700)
    
    elif system_type == "batch_control":
        # ===== BATCH CONTROL BASE =====
        # StartBtn -> ProcessActive
        start_contact = ET.SubElement(ld, "{%s}contact" % ns)
        start_contact.set("localId", str(current_id))
        ET.SubElement(start_contact, "{%s}position" % ns, x="100", y="100")
        cp_start = ET.SubElement(start_contact, "{%s}connectionPointIn" % ns)
        conn_start = ET.SubElement(cp_start, "{%s}connection" % ns)
        conn_start.set("refLocalId", "0")
        ET.SubElement(start_contact, "{%s}connectionPointOut" % ns)
        ET.SubElement(start_contact, "{%s}variable" % ns).text = "StartBtn"
        current_id += 1
        
        process_coil = ET.SubElement(ld, "{%s}coil" % ns)
        process_coil.set("localId", str(current_id))
        ET.SubElement(process_coil, "{%s}position" % ns, x="300", y="100")
        cp_proc = ET.SubElement(process_coil, "{%s}connectionPointIn" % ns)
        conn_proc = ET.SubElement(cp_proc, "{%s}connection" % ns)
        conn_proc.set("refLocalId", str(current_id-1))
        ET.SubElement(process_coil, "{%s}variable" % ns).text = "ProcessActive"
        current_id += 1
    
    else:
        # ===== GENERIC BASE CONTROL =====
        start_contact = ET.SubElement(ld, "{%s}contact" % ns)
        start_contact.set("localId", str(current_id))
        ET.SubElement(start_contact, "{%s}position" % ns, x="100", y="100")
        cp_start = ET.SubElement(start_contact, "{%s}connectionPointIn" % ns)
        conn_start = ET.SubElement(cp_start, "{%s}connection" % ns)
        conn_start.set("refLocalId", "0")
        ET.SubElement(start_contact, "{%s}connectionPointOut" % ns)
        ET.SubElement(start_contact, "{%s}variable" % ns).text = "StartBtn"
        current_id += 1
        
        process_coil = ET.SubElement(ld, "{%s}coil" % ns)
        process_coil.set("localId", str(current_id))
        ET.SubElement(process_coil, "{%s}position" % ns, x="300", y="100")
        cp_proc = ET.SubElement(process_coil, "{%s}connectionPointIn" % ns)
        conn_proc = ET.SubElement(cp_proc, "{%s}connection" % ns)
        conn_proc.set("refLocalId", str(current_id-1))
        ET.SubElement(process_coil, "{%s}variable" % ns).text = "ProcessActive"
        current_id += 1
    
    return current_id

def add_timer_section(ld, ns, start_id, system_type):
    """Add timer-based sequential control"""
    current_id = start_id
    
    # StartBtn Contact
    contact1 = ET.SubElement(ld, "{%s}contact" % ns)
    contact1.set("localId", str(current_id))
    ET.SubElement(contact1, "{%s}position" % ns, x="100", y="100")
    cp_in1 = ET.SubElement(contact1, "{%s}connectionPointIn" % ns)
    conn1 = ET.SubElement(cp_in1, "{%s}connection" % ns)
    conn1.set("refLocalId", "0")
    ET.SubElement(contact1, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact1, "{%s}variable" % ns).text = "StartBtn"
    current_id += 1

    if system_type == "conveyor":
        # ===== CONVEYOR SYSTEM LOGIC =====
        # Rung 1: Start/Stop with seal-in - StartBtn AND NOT StopBtn -> ProcessActive
        
        # StopBtn NC Contact (Normally Closed)
        stop_contact = ET.SubElement(ld, "{%s}contact" % ns)
        stop_contact.set("localId", str(current_id))
        stop_contact.set("negated", "true")
        ET.SubElement(stop_contact, "{%s}position" % ns, x="200", y="100")
        cp_stop = ET.SubElement(stop_contact, "{%s}connectionPointIn" % ns)
        conn_stop = ET.SubElement(cp_stop, "{%s}connection" % ns)
        conn_stop.set("refLocalId", str(current_id-1))  # From StartBtn
        ET.SubElement(stop_contact, "{%s}connectionPointOut" % ns)
        ET.SubElement(stop_contact, "{%s}variable" % ns).text = "StopBtn"
        current_id += 1
        
        # ProcessActive Coil (seal-in)
        process_coil = ET.SubElement(ld, "{%s}coil" % ns)
        process_coil.set("localId", str(current_id))
        ET.SubElement(process_coil, "{%s}position" % ns, x="400", y="100")
        cp_proc = ET.SubElement(process_coil, "{%s}connectionPointIn" % ns)
        conn_proc = ET.SubElement(cp_proc, "{%s}connection" % ns)
        conn_proc.set("refLocalId", str(current_id-1))
        ET.SubElement(process_coil, "{%s}variable" % ns).text = "ProcessActive"
        current_id += 1
        
        # Rung 2: ProcessActive -> ConveyorMotor
        process_contact = ET.SubElement(ld, "{%s}contact" % ns)
        process_contact.set("localId", str(current_id))
        ET.SubElement(process_contact, "{%s}position" % ns, x="100", y="200")
        cp_pc = ET.SubElement(process_contact, "{%s}connectionPointIn" % ns)
        conn_pc = ET.SubElement(cp_pc, "{%s}connection" % ns)
        conn_pc.set("refLocalId", "0")  # From power rail
        ET.SubElement(process_contact, "{%s}connectionPointOut" % ns)
        ET.SubElement(process_contact, "{%s}variable" % ns).text = "ProcessActive"
        current_id += 1
        
        # ConveyorMotor Coil
        motor_coil = ET.SubElement(ld, "{%s}coil" % ns)
        motor_coil.set("localId", str(current_id))
        ET.SubElement(motor_coil, "{%s}position" % ns, x="300", y="200")
        cp_motor = ET.SubElement(motor_coil, "{%s}connectionPointIn" % ns)
        conn_motor = ET.SubElement(cp_motor, "{%s}connection" % ns)
        conn_motor.set("refLocalId", str(current_id-1))
        ET.SubElement(motor_coil, "{%s}variable" % ns).text = "ConveyorMotor"
        current_id += 1
        
        # Rung 3: LoadStation sensor logic
        load_contact = ET.SubElement(ld, "{%s}contact" % ns)
        load_contact.set("localId", str(current_id))
        ET.SubElement(load_contact, "{%s}position" % ns, x="100", y="300")
        cp_load = ET.SubElement(load_contact, "{%s}connectionPointIn" % ns)
        conn_load = ET.SubElement(cp_load, "{%s}connection" % ns)
        conn_load.set("refLocalId", "0")
        ET.SubElement(load_contact, "{%s}connectionPointOut" % ns)
        ET.SubElement(load_contact, "{%s}variable" % ns).text = "LoadStation"
        current_id += 1
        
    elif system_type == "batch_control":
        # ===== BATCH CONTROL LOGIC =====
        # Add mixing timer with PT connection
        current_id = add_timer_block(ld, ns, current_id, "MixingTimer", "MixingTime", str(start_id), 300, 80)
        
        # ProcessActive Contact
        contact2 = ET.SubElement(ld, "{%s}contact" % ns)
        contact2.set("localId", str(current_id))
        ET.SubElement(contact2, "{%s}position" % ns, x="500", y="100")
        cp_in2 = ET.SubElement(contact2, "{%s}connectionPointIn" % ns)
        conn2 = ET.SubElement(cp_in2, "{%s}connection" % ns)
        conn2.set("refLocalId", str(current_id-1))
        conn2.set("formalParameter", "Q")
        ET.SubElement(contact2, "{%s}connectionPointOut" % ns)
        ET.SubElement(contact2, "{%s}variable" % ns).text = "ProcessActive"
        current_id += 1
        
        # Add heating timer
        current_id = add_timer_block(ld, ns, current_id, "HeatingTimer", "HeatingTime", str(current_id-1), 700, 80)
        
        # AgitatorMotor Coil
        coil1 = ET.SubElement(ld, "{%s}coil" % ns)
        coil1.set("localId", str(current_id))
        ET.SubElement(coil1, "{%s}position" % ns, x="900", y="100")
        cp_coil1 = ET.SubElement(coil1, "{%s}connectionPointIn" % ns)
        conn_coil1 = ET.SubElement(cp_coil1, "{%s}connection" % ns)
        conn_coil1.set("refLocalId", str(current_id-1))
        conn_coil1.set("formalParameter", "Q")
        ET.SubElement(coil1, "{%s}variable" % ns).text = "AgitatorMotor"
        current_id += 1
    
    else:
        # ===== GENERIC SYSTEM LOGIC =====
        # Simple Start -> ProcessActive -> Output
        process_coil = ET.SubElement(ld, "{%s}coil" % ns)
        process_coil.set("localId", str(current_id))
        ET.SubElement(process_coil, "{%s}position" % ns, x="300", y="100")
        cp_gen = ET.SubElement(process_coil, "{%s}connectionPointIn" % ns)
        conn_gen = ET.SubElement(cp_gen, "{%s}connection" % ns)
        conn_gen.set("refLocalId", str(current_id-1))
        ET.SubElement(process_coil, "{%s}variable" % ns).text = "ProcessActive"
        current_id += 1

    return current_id

def add_timer_block(ld, ns, start_id, timer_name, time_var, trigger_ref, x_pos, y_pos):
    """Add a complete timer block with PT connection"""
    current_id = start_id
    
    # Time variable input
    time_input = ET.SubElement(ld, "{%s}inVariable" % ns)
    time_input.set("localId", str(current_id))
    ET.SubElement(time_input, "{%s}position" % ns, x=str(x_pos-100), y=str(y_pos+20))
    ET.SubElement(time_input, "{%s}connectionPointOut" % ns)
    ET.SubElement(time_input, "{%s}expression" % ns).text = time_var
    current_id += 1

    # Timer block
    timer = ET.SubElement(ld, "{%s}block" % ns)
    timer.set("localId", str(current_id))
    timer.set("typeName", "TON")
    timer.set("instanceName", timer_name)
    ET.SubElement(timer, "{%s}position" % ns, x=str(x_pos), y=str(y_pos))
    
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
    pt_conn.set("refLocalId", str(current_id-1))
    
    ET.SubElement(timer, "{%s}inOutVariables" % ns)
    
    out_vars = ET.SubElement(timer, "{%s}outputVariables" % ns)
    q_var = ET.SubElement(out_vars, "{%s}variable" % ns)
    q_var.set("formalParameter", "Q")
    ET.SubElement(q_var, "{%s}connectionPointOut" % ns)
    
    current_id += 1
    return current_id

def add_counter_section(ld, ns, start_id, has_timers):
    """Add CTU counter for batch counting"""
    current_id = start_id
    
    # Counter trigger (end of process)
    trigger_var = "AgitatorMotor" if has_timers else "ProcessActive"
    
    contact_count = ET.SubElement(ld, "{%s}contact" % ns)
    contact_count.set("localId", str(current_id))
    contact_count.set("edge", "falling")
    ET.SubElement(contact_count, "{%s}position" % ns, x="100", y="300")
    cp_count = ET.SubElement(contact_count, "{%s}connectionPointIn" % ns)
    conn_count = ET.SubElement(cp_count, "{%s}connection" % ns)
    conn_count.set("refLocalId", "0")
    ET.SubElement(contact_count, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact_count, "{%s}variable" % ns).text = trigger_var
    current_id += 1
    
    # Reset contact
    contact_reset = ET.SubElement(ld, "{%s}contact" % ns)
    contact_reset.set("localId", str(current_id))
    ET.SubElement(contact_reset, "{%s}position" % ns, x="100", y="330")
    cp_reset = ET.SubElement(contact_reset, "{%s}connectionPointIn" % ns)
    conn_reset = ET.SubElement(cp_reset, "{%s}connection" % ns)
    conn_reset.set("refLocalId", "0")
    ET.SubElement(contact_reset, "{%s}connectionPointOut" % ns)
    ET.SubElement(contact_reset, "{%s}variable" % ns).text = "CounterReset"
    current_id += 1
    
    # BatchTarget input
    target_var = ET.SubElement(ld, "{%s}inVariable" % ns)
    target_var.set("localId", str(current_id))
    ET.SubElement(target_var, "{%s}position" % ns, x="200", y="340")
    ET.SubElement(target_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(target_var, "{%s}expression" % ns).text = "BatchTarget"
    current_id += 1
    
    # CTU Counter block
    counter = ET.SubElement(ld, "{%s}block" % ns)
    counter.set("localId", str(current_id))
    counter.set("typeName", "CTU")
    counter.set("instanceName", "BatchCounter")
    ET.SubElement(counter, "{%s}position" % ns, x="300", y="300")
    
    ctu_in_vars = ET.SubElement(counter, "{%s}inputVariables" % ns)
    
    # CU input
    cu_var = ET.SubElement(ctu_in_vars, "{%s}variable" % ns)
    cu_var.set("formalParameter", "CU")
    cu_cp = ET.SubElement(cu_var, "{%s}connectionPointIn" % ns)
    cu_conn = ET.SubElement(cu_cp, "{%s}connection" % ns)
    cu_conn.set("refLocalId", str(current_id-3))
    
    # R input
    r_var = ET.SubElement(ctu_in_vars, "{%s}variable" % ns)
    r_var.set("formalParameter", "R")
    r_cp = ET.SubElement(r_var, "{%s}connectionPointIn" % ns)
    r_conn = ET.SubElement(r_cp, "{%s}connection" % ns)
    r_conn.set("refLocalId", str(current_id-2))
    
    # PV input
    pv_var = ET.SubElement(ctu_in_vars, "{%s}variable" % ns)
    pv_var.set("formalParameter", "PV")
    pv_cp = ET.SubElement(pv_var, "{%s}connectionPointIn" % ns)
    pv_conn = ET.SubElement(pv_cp, "{%s}connection" % ns)
    pv_conn.set("refLocalId", str(current_id-1))
    
    ET.SubElement(counter, "{%s}inOutVariables" % ns)
    
    ctu_out_vars = ET.SubElement(counter, "{%s}outputVariables" % ns)
    q_ctu_var = ET.SubElement(ctu_out_vars, "{%s}variable" % ns)
    q_ctu_var.set("formalParameter", "Q")
    ET.SubElement(q_ctu_var, "{%s}connectionPointOut" % ns)
    
    current_id += 1
    
    # BatchComplete coil
    coil_complete = ET.SubElement(ld, "{%s}coil" % ns)
    coil_complete.set("localId", str(current_id))
    ET.SubElement(coil_complete, "{%s}position" % ns, x="500", y="320")
    cp_coil_complete = ET.SubElement(coil_complete, "{%s}connectionPointIn" % ns)
    conn_coil_complete = ET.SubElement(cp_coil_complete, "{%s}connection" % ns)
    conn_coil_complete.set("refLocalId", str(current_id-1))
    conn_coil_complete.set("formalParameter", "Q")
    ET.SubElement(coil_complete, "{%s}variable" % ns).text = "BatchComplete"
    current_id += 1

    return current_id

def add_pid_section(ld, ns, start_id, pid_tuning):
    """Add PID temperature control section"""
    current_id = start_id
    
    # PID input variables
    pid_inputs = [
        ("actual_temp", str(current_id)),
        ("setpoint_temp", str(current_id + 1)),
        (str(pid_tuning["Kp"]), str(current_id + 2)),
        (str(pid_tuning["Tn"]), str(current_id + 3)),
        (str(pid_tuning["Tv"]), str(current_id + 4)),
        ("y_manual", str(current_id + 5)),
        ("y_offset", str(current_id + 6)),
        ("y_min", str(current_id + 7)),
        ("y_max", str(current_id + 8)),
        ("cycle", str(current_id + 9))
    ]
    
    for expression, local_id in pid_inputs:
        invar = ET.SubElement(ld, "{%s}inVariable" % ns)
        invar.set("localId", local_id)
        ET.SubElement(invar, "{%s}position" % ns, x="0", y="0")
        ET.SubElement(invar, "{%s}connectionPointOut" % ns)
        ET.SubElement(invar, "{%s}expression" % ns).text = expression
    
    current_id += 10
    
    # Boolean contacts
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
    ET.SubElement(contact_manual, "{%s}variable" % ns).text = "Manual"
    current_id += 1
    
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
    ET.SubElement(contact_reset, "{%s}variable" % ns).text = "reset"
    current_id += 1
    
    # PID Block
    pid_block = ET.SubElement(ld, "{%s}block" % ns)
    pid_block.set("localId", str(current_id))
    pid_block.set("typeName", "PID_FIXCYCLE")
    pid_block.set("instanceName", "TempController")
    ET.SubElement(pid_block, "{%s}position" % ns, x="200", y="400")
    
    pid_in_vars = ET.SubElement(pid_block, "{%s}inputVariables" % ns)
    
    pid_connections = [
        ("ACTUAL", str(start_id)),
        ("SET_POINT", str(start_id + 1)),
        ("KP", str(start_id + 2)),
        ("TN", str(start_id + 3)),
        ("TV", str(start_id + 4)),
        ("Y_MANUAL", str(start_id + 5)),
        ("Y_OFFSET", str(start_id + 6)),
        ("Y_MIN", str(start_id + 7)),
        ("Y_MAX", str(start_id + 8)),
        ("MANUAL", str(current_id - 2)),
        ("RESET", str(current_id - 1)),
        ("CYCLE", str(start_id + 9))
    ]
    
    for param_name, ref_id in pid_connections:
        pid_var = ET.SubElement(pid_in_vars, "{%s}variable" % ns)
        pid_var.set("formalParameter", param_name)
        pid_cp = ET.SubElement(pid_var, "{%s}connectionPointIn" % ns)
        pid_conn = ET.SubElement(pid_cp, "{%s}connection" % ns)
        pid_conn.set("refLocalId", ref_id)
    
    ET.SubElement(pid_block, "{%s}inOutVariables" % ns)
    
    pid_out_vars = ET.SubElement(pid_block, "{%s}outputVariables" % ns)
    
    y_var = ET.SubElement(pid_out_vars, "{%s}variable" % ns)
    y_var.set("formalParameter", "Y")
    ET.SubElement(y_var, "{%s}connectionPointOut" % ns)
    
    limits_var = ET.SubElement(pid_out_vars, "{%s}variable" % ns)
    limits_var.set("formalParameter", "LIMITS_ACTIVE")
    limits_cp = ET.SubElement(limits_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(limits_cp, "{%s}expression" % ns).text = "limits_active"
    
    overflow_var = ET.SubElement(pid_out_vars, "{%s}variable" % ns)
    overflow_var.set("formalParameter", "OVERFLOW")
    overflow_cp = ET.SubElement(overflow_var, "{%s}connectionPointOut" % ns)
    ET.SubElement(overflow_cp, "{%s}expression" % ns).text = "Overflow"
    
    # PID addData
    pid_add_data = ET.SubElement(pid_block, "{%s}addData" % ns)
    pid_data = ET.SubElement(pid_add_data, "{%s}data" % ns)
    pid_data.set("name", "http://www.3s-software.com/plcopenxml/fbdcalltype")
    pid_data.set("handleUnknown", "implementation")
    pid_call_type = ET.SubElement(pid_data, "CallType", xmlns="")
    pid_call_type.text = "functionblock"
    
    current_id += 1
    
    # Output variable
    heater_output = ET.SubElement(ld, "{%s}outVariable" % ns)
    heater_output.set("localId", str(current_id))
    ET.SubElement(heater_output, "{%s}position" % ns, x="600", y="420")
    heater_cp = ET.SubElement(heater_output, "{%s}connectionPointIn" % ns)
    heater_conn = ET.SubElement(heater_cp, "{%s}connection" % ns)
    heater_conn.set("refLocalId", str(current_id - 1))
    heater_conn.set("formalParameter", "Y")
    ET.SubElement(heater_output, "{%s}expression" % ns).text = "heater_output"
    
    current_id += 1
    return current_id

if __name__ == "__main__":
    # Example usage
    xml_content = create_automation_system(
        system_type="batch_control",
        include_timers=True,
        include_counters=True,
        include_pid=True,
        pid_tuning={"Kp": 1.5, "Tn": 10.0, "Tv": 2.0}
    )
    
    # Pretty format
    reparsed = minidom.parseString(xml_content)
    pretty_xml = reparsed.toprettyxml(indent="  ")
    
    with open("CompleteAutomationSystem.xml", "w", encoding="utf-8") as f:
        f.write(pretty_xml)
    
    print("Generated CompleteAutomationSystem.xml")