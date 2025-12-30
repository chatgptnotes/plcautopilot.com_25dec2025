(* ============================================================
   2-Pump Redundancy Program for TM241CE24T
   EcoStruxure Machine Expert - Structured Text (ST)

   Copy this code into your Machine Expert project:
   1. Create new project for TM241CE24T
   2. Add new POU (Program) named "PLC_PRG"
   3. Select Structured Text language
   4. Paste this code
   5. Map I/O addresses in Device Configuration

   PLCAutoPilot v1.0
   ============================================================ *)

PROGRAM PLC_PRG
VAR
    (* ===== DIGITAL INPUTS ===== *)
    EMERGENCY_PB    AT %IX0.0 : BOOL;   (* Emergency Stop - NC, closed when OK *)
    LOW_LEVEL_SW    AT %IX0.1 : BOOL;   (* Tank Low Level - NC, opens when low *)
    HIGH_LEVEL_SW   AT %IX0.2 : BOOL;   (* Tank High Level - NO, closes when full *)
    PUMP1_OL        AT %IX0.3 : BOOL;   (* Pump 1 Overload - NC, opens on fault *)
    PUMP2_OL        AT %IX0.4 : BOOL;   (* Pump 2 Overload - NC, opens on fault *)
    PUMP1_DRY       AT %IX0.5 : BOOL;   (* Pump 1 Dry Run - NC, opens on dry run *)
    PUMP2_DRY       AT %IX0.6 : BOOL;   (* Pump 2 Dry Run - NC, opens on dry run *)
    START_PB        AT %IX0.7 : BOOL;   (* Start Button - NO *)
    STOP_PB         AT %IX0.8 : BOOL;   (* Stop Button - NC, closed when not pressed *)
    RESET_PB        AT %IX0.9 : BOOL;   (* Alarm Reset - NO *)

    (* ===== DIGITAL OUTPUTS ===== *)
    PUMP1_RUN       AT %QX0.0 : BOOL;   (* Pump 1 Contactor *)
    PUMP2_RUN       AT %QX0.1 : BOOL;   (* Pump 2 Contactor *)
    PUMP1_RUN_LAMP  AT %QX0.2 : BOOL;   (* Pump 1 Running Indicator *)
    PUMP2_RUN_LAMP  AT %QX0.3 : BOOL;   (* Pump 2 Running Indicator *)
    PUMP1_FAULT_LAMP AT %QX0.4 : BOOL;  (* Pump 1 Fault Indicator *)
    PUMP2_FAULT_LAMP AT %QX0.5 : BOOL;  (* Pump 2 Fault Indicator *)
    TANK_FULL_LAMP  AT %QX0.6 : BOOL;   (* Tank Full Indicator *)
    TANK_LOW_LAMP   AT %QX0.7 : BOOL;   (* Tank Low Indicator *)

    (* ===== INTERNAL VARIABLES ===== *)
    SYSTEM_READY    : BOOL := FALSE;    (* System ready after startup delay *)
    PUMP1_FAULT     : BOOL := FALSE;    (* Pump 1 fault - latched *)
    PUMP2_FAULT     : BOOL := FALSE;    (* Pump 2 fault - latched *)
    PUMP1_ENABLED   : BOOL := FALSE;    (* Pump 1 healthy and available *)
    PUMP2_ENABLED   : BOOL := FALSE;    (* Pump 2 healthy and available *)
    AUTO_MODE       : BOOL := FALSE;    (* Auto mode active *)
    USE_STANDBY     : BOOL := FALSE;    (* Use standby pump *)
    TANK_LOW        : BOOL := FALSE;    (* Tank needs filling *)
    TANK_FULL       : BOOL := FALSE;    (* Tank is full *)

    (* ===== TIMERS ===== *)
    StartupTimer    : TON;              (* 3 second startup delay *)

    (* ===== EDGE DETECTION ===== *)
    R_TRIG_Start    : R_TRIG;           (* Start button rising edge *)
END_VAR

(* ============================================================
   MAIN PROGRAM LOGIC
   ============================================================ *)

(* ----- RUNG 0: System Ready with 3-Second Startup Timer ----- *)
(* System is ready when Emergency Stop is OK (closed) for 3 seconds *)
StartupTimer(IN := EMERGENCY_PB, PT := T#3S);
SYSTEM_READY := StartupTimer.Q;

(* ----- RUNG 1: Tank Low Level Detection ----- *)
(* NC switch: TRUE when closed (normal), FALSE when open (low level) *)
(* Tank is LOW when switch is OPEN (NOT pressed) *)
TANK_LOW := SYSTEM_READY AND NOT LOW_LEVEL_SW;

(* ----- RUNG 2: Tank High Level Detection ----- *)
(* NO switch: FALSE when open (normal), TRUE when closed (full) *)
(* Tank is FULL when switch is CLOSED *)
TANK_FULL := SYSTEM_READY AND HIGH_LEVEL_SW;

(* ----- RUNG 3: Pump 1 Fault Detection (Latched) ----- *)
(* Fault conditions: Overload OR Dry Run (NC switches open on fault) *)
(* Fault is latched until RESET_PB is pressed *)
IF (NOT PUMP1_OL OR NOT PUMP1_DRY) THEN
    PUMP1_FAULT := TRUE;
END_IF;
IF RESET_PB THEN
    PUMP1_FAULT := FALSE;
END_IF;

(* ----- RUNG 4: Pump 2 Fault Detection (Latched) ----- *)
IF (NOT PUMP2_OL OR NOT PUMP2_DRY) THEN
    PUMP2_FAULT := TRUE;
END_IF;
IF RESET_PB THEN
    PUMP2_FAULT := FALSE;
END_IF;

(* ----- RUNG 5: Pump 1 Enabled ----- *)
(* Pump 1 is available when system ready and no fault *)
PUMP1_ENABLED := SYSTEM_READY AND NOT PUMP1_FAULT;

(* ----- RUNG 6: Pump 2 Enabled ----- *)
(* Pump 2 is available when system ready and no fault *)
PUMP2_ENABLED := SYSTEM_READY AND NOT PUMP2_FAULT;

(* ----- RUNG 7: Auto Mode Control (Start/Stop with Seal-in) ----- *)
(* Start button activates, Stop button or system not ready deactivates *)
R_TRIG_Start(CLK := START_PB);
IF R_TRIG_Start.Q THEN
    AUTO_MODE := TRUE;
END_IF;
IF NOT STOP_PB OR NOT SYSTEM_READY THEN
    AUTO_MODE := FALSE;
END_IF;

(* ----- RUNG 8: Switch to Standby (Primary Failed) ----- *)
(* Switch to Pump 2 when Pump 1 fails and Pump 2 is available *)
(* Stays in standby mode until Pump 1 is healthy again *)
IF PUMP1_FAULT AND PUMP2_ENABLED THEN
    USE_STANDBY := TRUE;
END_IF;
(* Return to primary when Pump 1 is healthy and reset is pressed *)
IF PUMP1_ENABLED AND RESET_PB THEN
    USE_STANDBY := FALSE;
END_IF;

(* ----- RUNG 9: Pump 1 Run Command (Primary) ----- *)
(* Pump 1 runs when: Auto mode AND Tank Low AND NOT Tank Full
   AND Pump 1 Enabled AND NOT Using Standby *)
PUMP1_RUN := AUTO_MODE
             AND TANK_LOW
             AND NOT TANK_FULL
             AND PUMP1_ENABLED
             AND NOT USE_STANDBY;

(* ----- RUNG 10: Pump 2 Run Command (Standby) ----- *)
(* Pump 2 runs when: Auto mode AND Tank Low AND NOT Tank Full
   AND Pump 2 Enabled AND Using Standby *)
PUMP2_RUN := AUTO_MODE
             AND TANK_LOW
             AND NOT TANK_FULL
             AND PUMP2_ENABLED
             AND USE_STANDBY;

(* ----- RUNGS 11-16: Indicator Lamps ----- *)
PUMP1_RUN_LAMP := PUMP1_RUN;
PUMP2_RUN_LAMP := PUMP2_RUN;
PUMP1_FAULT_LAMP := PUMP1_FAULT;
PUMP2_FAULT_LAMP := PUMP2_FAULT;
TANK_FULL_LAMP := TANK_FULL;
TANK_LOW_LAMP := TANK_LOW;

END_PROGRAM
