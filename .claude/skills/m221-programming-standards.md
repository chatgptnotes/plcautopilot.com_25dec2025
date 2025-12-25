# M221 Programming Standards and Timer Reference

## VERIFIED FROM ACTUAL .smbp FILES

This document contains verified programming standards and timer structures for Schneider Electric M221 PLC programs (.smbp format).

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Reserved Words to Avoid](#reserved-words-to-avoid)
3. [Timer Programming](#timer-programming)
4. [Complete Examples](#complete-examples)

---

## Naming Conventions

### General Rules

| Rule | Description | Example |
|------|-------------|---------|
| Use underscores | Separate words with `_` | `MOTOR_RUN`, `LIGHT1_SW` |
| No spaces | Spaces are not allowed | `MOTOR RUN` is invalid |
| No hyphens | Hyphens cause parsing issues | `MOTOR-RUN` is invalid |
| UPPERCASE | Use uppercase for all symbols | `AUTO_RUN` not `auto_run` |
| Max 32 chars | Symbol length limit | Keep names concise |
| Prefix convention | Use prefixes for clarity | `PB_`, `SW_`, `MTR_`, `VLV_` |

### Recommended Prefixes

| Prefix | Meaning | Example |
|--------|---------|---------|
| `PB_` | Push Button | `PB_START`, `PB_RESET` |
| `SW_` | Switch | `SW_AUTO`, `SW_MANUAL` |
| `SS_` | Selector Switch | `SS_MODE`, `SS_SPEED` |
| `LS_` | Limit Switch | `LS_HOME`, `LS_END` |
| `PS_` | Pressure Switch | `PS_HIGH`, `PS_LOW` |
| `TS_` | Temperature Switch | `TS_OVERHEAT` |
| `FS_` | Flow Switch | `FS_MIN`, `FS_MAX` |
| `MTR_` | Motor | `MTR_PUMP`, `MTR_FAN` |
| `VLV_` | Valve | `VLV_INLET`, `VLV_OUTLET` |
| `SOL_` | Solenoid | `SOL_LOCK`, `SOL_RELEASE` |
| `LT_` | Light/Lamp | `LT_RUN`, `LT_ALARM` |
| `TMR_` | Timer | `TMR_DELAY`, `TMR_CYCLE` |
| `CNT_` | Counter | `CNT_PARTS`, `CNT_CYCLES` |
| `ALM_` | Alarm | `ALM_ESTOP`, `ALM_OVERLOAD` |
| `STS_` | Status | `STS_RUNNING`, `STS_FAULT` |

### Recommended Suffixes

| Suffix | Meaning | Example |
|--------|---------|---------|
| `_SW` | Switch input | `LIGHT1_SW`, `MODE_SW` |
| `_PB` | Push button | `CYCLE_PB`, `RESET_PB` |
| `_FB` | Feedback | `MOTOR_FB`, `VALVE_FB` |
| `_CMD` | Command | `MOTOR_CMD`, `VALVE_CMD` |
| `_RUN` | Running status | `AUTO_RUN`, `CYCLE_RUN` |
| `_DONE` | Completed status | `TMR0_DONE`, `SEQ_DONE` |
| `_ERR` | Error status | `COMM_ERR`, `DRIVE_ERR` |
| `_OK` | OK status | `SAFETY_OK`, `READY_OK` |

---

## Reserved Words to Avoid

### CRITICAL: Never Use These Words as Symbols

The following words are reserved in Schneider Electric programming software and will cause errors or unexpected behavior:

| Reserved Word | Reason | Use Instead |
|---------------|--------|-------------|
| `START` | System reserved | `PB_START`, `CYCLE_START`, `SEQ_START` |
| `STOP` | System reserved | `PB_STOP`, `CYCLE_STOP`, `SEQ_STOP` |
| `RUN` | System reserved | `AUTO_RUN`, `MOTOR_RUN`, `CYCLE_RUN` |
| `RESET` | System reserved | `PB_RESET`, `SYS_RESET`, `ALM_RESET` |
| `SET` | IL instruction | `CMD_SET`, `FLAG_SET` |
| `AND` | IL instruction | Use descriptive names |
| `OR` | IL instruction | Use descriptive names |
| `NOT` | IL instruction | Use descriptive names |
| `LD` | IL instruction | Use descriptive names |
| `ST` | IL instruction | Use descriptive names |
| `IN` | Timer/Counter | Use descriptive names |
| `OUT` | Timer/Counter | Use descriptive names |
| `TRUE` | Boolean constant | Use `ON_STATE`, `ENABLED` |
| `FALSE` | Boolean constant | Use `OFF_STATE`, `DISABLED` |

### System Bits to Avoid Conflicts

| System Address | Description | Never Use As Symbol |
|----------------|-------------|---------------------|
| `%S0` | Cold start | COLDSTART |
| `%S1` | Warm start | WARMSTART |
| `%S4` - `%S7` | Time base pulses | TB10MS, TB100MS, TB1S, TB1MIN |
| `%S12` | Run mode | RUNMODE |
| `%S13` | First scan | FIRSTSCAN |

---

## Timer Programming

### Timer Structure Overview

Timers in M221 require configuration in THREE separate sections:

1. **Ladder Elements** - Visual representation
2. **Instruction Lines** - IL code using BLK...END_BLK
3. **Timers Configuration** - Timer parameters

### Timer Configuration (Verified Structure)

```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>5</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

### WRONG vs CORRECT Timer Configuration

| Element | WRONG | CORRECT |
|---------|-------|---------|
| Tag | `<Timer>` | `<TimerTM>` |
| Time base | `<TimeBase>TimeBase1s</TimeBase>` | `<Base>OneSecond</Base>` |
| Type | `<Type>TON</Type>` | Not needed |
| Symbol | `<Symbol>TMR_DELAY</Symbol>` | Not needed in config |

### Time Base Values

| Base Value | Duration | Calculation Example |
|------------|----------|---------------------|
| `OneMs` | 1 millisecond | Preset=100 = 100ms |
| `TenMs` | 10 milliseconds | Preset=50 = 500ms |
| `HundredMs` | 100 milliseconds | Preset=30 = 3 seconds |
| `OneSecond` | 1 second | Preset=5 = 5 seconds |
| `OneMinute` | 1 minute | Preset=2 = 2 minutes |

### Timer in Ladder Element

```xml
<LadderEntity>
  <ElementType>Timer</ElementType>
  <Descriptor>%TM0</Descriptor>
  <Comment />
  <Symbol />
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

**CRITICAL:** Use `<ElementType>Timer</ElementType>` NOT `TimerFunctionBlock`

### Timer in Instruction List (BLK Structure)

```
BLK   %TM0      ; Start timer block
LD    %I0.0     ; Load input condition
IN               ; Apply to timer IN (starts timing)
OUT_BLK          ; Exit block section, outputs available
LD    Q          ; Load timer Q output (done bit)
ST    %M0        ; Store to memory bit
END_BLK          ; End timer block
```

### Timer Block Instructions Explained

| Instruction | Purpose |
|-------------|---------|
| `BLK %TM0` | Open timer block for %TM0 |
| `LD %I0.0` | Load the input condition |
| `IN` | Apply condition to timer input |
| `OUT_BLK` | End input section, begin output section |
| `LD Q` | Load timer done bit (Q output) |
| `ST %M0` | Store result to memory bit |
| `END_BLK` | Close timer block |

### Timer Output Access

**WRONG - Direct access does NOT work:**
```
LD    %TM0.Q    ; This will cause errors
ST    %Q0.0
```

**CORRECT - Use memory bit inside BLK:**
```
BLK   %TM0
LD    %I0.0
IN
OUT_BLK
LD    Q          ; Access Q here
ST    %M1        ; Store to memory bit
END_BLK

; Later in program, use %M1
LD    %M1
ST    %Q0.0
```

### Multiple Timers (Cascaded)

For sequential operations:

```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>5</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
  <TimerTM>
    <Address>%TM1</Address>
    <Index>1</Index>
    <Preset>5</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

**IL for cascaded timers:**
```
; Timer 0 - 5 second delay
BLK   %TM0
LD    %Q0.0      ; Light 1 ON starts timer
IN
OUT_BLK
LD    Q
ST    %M1        ; TMR0_DONE
END_BLK

; Timer 1 - starts when Timer 0 done
BLK   %TM1
LD    %M1        ; Timer 0 done starts Timer 1
IN
OUT_BLK
LD    Q
ST    %M2        ; TMR1_DONE
END_BLK
```

---

## Complete Examples

### Example 1: Sequential Lights with Timers

**I/O Mapping:**

| Address | Symbol | Description |
|---------|--------|-------------|
| %I0.0 | MODE_AUTO | Auto/Manual selector switch |
| %I0.1 | PB_START | Start push button |
| %I0.2 | ESTOP | Emergency stop (NC) |
| %I0.3 | LIGHT1_SW | Manual switch for Light 1 |
| %I0.4 | LIGHT2_SW | Manual switch for Light 2 |
| %I0.5 | LIGHT3_SW | Manual switch for Light 3 |
| %Q0.0 | LIGHT1 | Light 1 output |
| %Q0.1 | LIGHT2 | Light 2 output |
| %Q0.2 | LIGHT3 | Light 3 output |
| %M0 | AUTO_RUN | Auto sequence running flag |
| %M1 | TMR0_DONE | Timer 0 done (Light 2 trigger) |
| %M2 | TMR1_DONE | Timer 1 done (Light 3 trigger) |
| %TM0 | - | 5 second timer for Light 2 |
| %TM1 | - | 5 second timer for Light 3 |

**Program Structure (6 Rungs):**

1. **Auto Mode Latch**
   - Logic: (PB_START OR AUTO_RUN) AND MODE_AUTO AND NOT ESTOP
   - Output: %M0 (AUTO_RUN)

2. **Light 1 Control**
   - Logic: (LIGHT1_SW AND NOT MODE_AUTO) OR (AUTO_RUN AND MODE_AUTO) AND NOT ESTOP
   - Output: %Q0.0 (LIGHT1)

3. **Timer 0 for Light 2**
   - Input: %Q0.0 (LIGHT1)
   - Output: %M1 (TMR0_DONE) via BLK structure

4. **Light 2 Control**
   - Logic: (LIGHT2_SW AND NOT MODE_AUTO) OR (TMR0_DONE AND MODE_AUTO) AND NOT ESTOP
   - Output: %Q0.1 (LIGHT2)

5. **Timer 1 for Light 3**
   - Input: %Q0.1 (LIGHT2)
   - Output: %M2 (TMR1_DONE) via BLK structure

6. **Light 3 Control**
   - Logic: (LIGHT3_SW AND NOT MODE_AUTO) OR (TMR1_DONE AND MODE_AUTO) AND NOT ESTOP
   - Output: %Q0.2 (LIGHT3)

### Example 2: Motor Control with Safety

**I/O Mapping:**

| Address | Symbol | Description |
|---------|--------|-------------|
| %I0.0 | PB_FWD | Forward push button |
| %I0.1 | PB_STOP | Stop push button (NC) |
| %I0.2 | ESTOP | Emergency stop (NC) |
| %I0.3 | OL_TRIP | Overload relay trip (NC) |
| %Q0.0 | MTR_FWD | Motor forward contactor |
| %Q0.1 | LT_RUN | Run indicator light |
| %Q0.2 | LT_ALARM | Alarm indicator light |

**Note:** `PB_STOP` is used instead of `STOP` to avoid reserved word conflict.

### Example 3: Valve Sequence with Timers

**I/O Mapping:**

| Address | Symbol | Description |
|---------|--------|-------------|
| %I0.0 | PB_CYCLE | Cycle start button |
| %I0.1 | SS_AUTO | Auto/Manual selector |
| %I0.2 | ESTOP | Emergency stop |
| %Q0.0 | VLV_INLET | Inlet valve |
| %Q0.1 | VLV_PROCESS | Process valve |
| %Q0.2 | VLV_OUTLET | Outlet valve |
| %M0 | CYCLE_RUN | Cycle running flag |
| %M1 | SEQ_STEP1 | Sequence step 1 complete |
| %M2 | SEQ_STEP2 | Sequence step 2 complete |
| %TM0 | - | Step 1 timer (inlet open time) |
| %TM1 | - | Step 2 timer (process time) |

---

## Common Mistakes to Avoid

### 1. Using Reserved Words

```
; WRONG
Symbol: START
Symbol: STOP
Symbol: RUN

; CORRECT
Symbol: PB_START
Symbol: PB_STOP
Symbol: MTR_RUN
```

### 2. Wrong Timer Element Type

```xml
<!-- WRONG -->
<ElementType>TimerFunctionBlock</ElementType>

<!-- CORRECT -->
<ElementType>Timer</ElementType>
```

### 3. Wrong Timer Configuration Tag

```xml
<!-- WRONG -->
<Timer>
  <Address>%TM0</Address>
</Timer>

<!-- CORRECT -->
<TimerTM>
  <Address>%TM0</Address>
</TimerTM>
```

### 4. Wrong Time Base Format

```xml
<!-- WRONG -->
<TimeBase>TimeBase1s</TimeBase>

<!-- CORRECT -->
<Base>OneSecond</Base>
```

### 5. Direct Timer Output Access

```
; WRONG
LD    %TM0.Q
ST    %Q0.0

; CORRECT
BLK   %TM0
LD    %I0.0
IN
OUT_BLK
LD    Q
ST    %M1
END_BLK
```

### 6. Using Spaces or Hyphens in Symbols

```
; WRONG
Symbol: MOTOR RUN
Symbol: MOTOR-RUN

; CORRECT
Symbol: MOTOR_RUN
```

---

## Branch Connection Patterns

### CRITICAL: Parallel Branch Structure

When creating OR logic with parallel paths, use this pattern:

```
Row 0: [Contact A] ---- [Element B] ---- [Lines] ---- [Coil]
       Down,L,R         Down,L,R          L,R          L

Row 1: [Contact C] ---- [Line]
       L,R               L,Up
```

**Key Rules:**
1. Row 0, Col 0 (start of branch): `Down, Left, Right`
2. Row 0, Col 1 (reconnection point): `Down, Left, Right`
3. Row 1, Col 0 (parallel contact): `Left, Right` (NOT `Up, Left`)
4. Row 1, Col 1 (reconnection line): `Left, Up`

### Example: OR Logic Branch

```xml
<!-- Row 0, Col 0: Main contact, starts branch -->
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%I0.0</Descriptor>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Down, Left, Right</ChosenConnection>
</LadderEntity>

<!-- Row 0, Col 1: Next element, allows branch reconnection -->
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%I0.1</Descriptor>
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Down, Left, Right</ChosenConnection>
</LadderEntity>

<!-- Row 1, Col 0: Parallel contact -->
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%M0</Descriptor>
  <Row>1</Row>
  <Column>0</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>

<!-- Row 1, Col 1: Line reconnects up to Row 0 -->
<LadderEntity>
  <ElementType>Line</ElementType>
  <Row>1</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Up</ChosenConnection>
</LadderEntity>
```

### Common Branch Mistakes

| Mistake | Problem | Correct |
|---------|---------|---------|
| Row 1, Col 0 with `Up, Left` | Doesn't continue flow | Use `Left, Right` |
| Missing Line at Row 1, Col 1 | No reconnection point | Add Line with `Left, Up` |
| Row 0, Col 1 without `Down` | Branch can't reconnect | Add `Down` to connection |

---

## Validation Checklist

Before saving any .smbp file, verify:

- [ ] No reserved words used as symbols (START, STOP, RUN, RESET, etc.)
- [ ] All symbols use underscores, no spaces or hyphens
- [ ] Timer elements use `<ElementType>Timer</ElementType>`
- [ ] Timer config uses `<TimerTM>` not `<Timer>`
- [ ] Time base uses `<Base>OneSecond</Base>` format
- [ ] Timer IL uses BLK...END_BLK structure
- [ ] Timer Q output stored to memory bit via `LD Q` inside block
- [ ] Memory bits properly declared in `<MemoryBits>` section
- [ ] No XML comments inside `<LadderElements>` sections
- [ ] All `<Comment>` elements are empty self-closing tags: `<Comment />`
- [ ] Branch Row 1 contacts use `Left, Right` NOT `Up, Left`
- [ ] Branch Row 1 has Line element with `Left, Up` to reconnect

---

## Quick Reference Card

### Timer IL Template
```
BLK   %TMx
LD    <input>
IN
OUT_BLK
LD    Q
ST    %My
END_BLK
```

### Timer Config Template
```xml
<TimerTM>
  <Address>%TM0</Address>
  <Index>0</Index>
  <Preset>5</Preset>
  <Base>OneSecond</Base>
</TimerTM>
```

### Naming Convention Template
```
[PREFIX]_[DESCRIPTION]_[SUFFIX]

Examples:
PB_CYCLE_START
MTR_PUMP_RUN
VLV_INLET_CMD
TMR_DELAY_DONE
```

---

## Version History

- **v1.1** (2025-12-25): Added branch connection patterns for OR logic
- **v1.0** (2025-12-25): Initial documentation combining timer programming and naming standards

---

**PLCAutoPilot | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
