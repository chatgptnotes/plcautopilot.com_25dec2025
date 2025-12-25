# Process Flow for Editing .smbp Files

## Overview

This document describes the process used to edit Schneider Electric M221 PLC program files (.smbp format) using Claude Code CLI.

---

## Technology Used

| Technology | Purpose |
|------------|---------|
| **Claude Code CLI** | Anthropic's command-line interface for Claude AI |
| **Read Tool** | To read file contents (supports text, images, PDFs) |
| **Edit Tool** | To perform exact string replacements in files |
| **XML Knowledge** | Understanding of the .smbp file structure |

---

## Process Flow

### Step 1: Read the Original File

```
Tool: Read
Input: c:\Users\Hp\Downloads\motor_start_stop_TM221CE24T.smbp
```

- Read the entire XML file (1003 lines)
- Analyzed the existing structure to understand the schema
- Identified key sections:
  - `<Rungs>` - Contains ladder logic rungs
  - `<LadderElements>` - Individual ladder elements (contacts, coils, lines)
  - `<InstructionLines>` - Instruction List (IL) representation
  - `<DigitalInputs>` - Input configuration with symbols
  - `<DigitalOutputs>` - Output configuration with symbols

---

### Step 2: Understand the Existing Logic

The original file had a simple motor start/stop circuit:

```
%I0.0 (START_MOTOR) -> %I0.1 (STOP_MOTOR) -> %Q0.0 (MOTOR_RUN)
                 |
          %Q0.0 (seal-in)
```

**Original I/O Mapping:**
| Address | Symbol | Function |
|---------|--------|----------|
| %I0.0 | START_MOTOR | Start pushbutton (NO) |
| %I0.1 | STOP_MOTOR | Stop pushbutton (NC) |
| %Q0.0 | MOTOR_RUN | Motor contactor output |

---

### Step 3: Plan the New Logic

**Additions Required:**
- **%I0.2 ESTOP** - Emergency Stop button (NC contact in Rung 1)
- **%I0.3 OVERLOAD** - Overload Relay contact (NC contact in Rung 1)
- **%Q0.1 ALARM** - Alarm output (new Rung 2)

**New Logic:**

**Rung 1 - Motor Control with Safety:**
```
(START OR MOTOR_RUN) AND NOT STOP AND NOT ESTOP AND NOT OVERLOAD = MOTOR_RUN
```

**Rung 2 - Alarm Logic:**
```
ESTOP OR OVERLOAD = ALARM
```

---

### Step 4: Edit Using String Replacement

The Edit tool performs exact string matching and replacement:

```
Tool: Edit
Parameters:
  - file_path: path to .smbp file
  - old_string: exact XML block to replace
  - new_string: new XML block with additions
```

#### Edit 1: Replace the Rungs Section

**What was changed:**
- Added ESTOP (%I0.2) as `<NegatedContact>` element at Column 2
- Added OVERLOAD (%I0.3) as `<NegatedContact>` element at Column 3
- Added new `<RungEntity>` for Alarm logic (Rung 2)
- Updated `<InstructionLines>` with new IL code:
  ```
  LD    %I0.0
  OR    %Q0.0
  ANDN  %I0.1
  ANDN  %I0.2    <- NEW
  ANDN  %I0.3    <- NEW
  ST    %Q0.0
  ```

#### Edit 2: Update Digital Inputs

Added symbols to input configuration:
```xml
<DiscretInput>
  <Address>%I0.2</Address>
  <Index>2</Index>
  <Symbol>ESTOP</Symbol>        <!-- ADDED -->
  <DIFiltering>DIFilterings4ms</DIFiltering>
  <DILatch>DILatchNo</DILatch>
</DiscretInput>
```

#### Edit 3: Update Digital Outputs

Added symbol to output configuration:
```xml
<DiscretOutput>
  <Address>%Q0.1</Address>
  <Index>1</Index>
  <Symbol>ALARM</Symbol>        <!-- ADDED -->
</DiscretOutput>
```

---

### Step 5: First Attempt Failed

**Problem:** I added XML comments inside the `<LadderElements>` section:

```xml
<!-- START_MOTOR Contact (NO) at Column 0 -->
<LadderEntity>
  ...
</LadderEntity>
```

**Result:**
- EcoStruxure Machine Expert Basic parser could not handle these comments
- Empty rungs displayed in the software
- "Program error(s) detected" message

---

### Step 6: Debug Using Screenshot

```
Tool: Read
Input: c:\Users\Hp\OneDrive\Pictures\Screenshots 1\Screenshot 2025-12-25 200603.png
```

**Claude Code Capability:** Can read images (multimodal)

**What was observed:**
- Error message: "Program error(s) detected"
- Empty rung body in the ladder view
- POU name visible but no logic elements

---

### Step 7: Fix the File

**Changes made to fix:**

1. **Removed ALL XML comments** from `<LadderElements>` sections
   ```xml
   <!-- This comment breaks the parser -->
   ```

2. **Changed comment elements to empty tags:**
   ```xml
   <!-- Before (broken): -->
   <Comment>Emergency Stop - NC for safety</Comment>

   <!-- After (working): -->
   <Comment />
   ```

3. **Removed extra Comment elements** from `<DiscretInput>` and `<DiscretOutput>` that weren't in the original schema

---

## Key XML Structure Knowledge

### LadderEntity Structure

```xml
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%I0.0</Descriptor>
  <Comment />
  <Symbol>START_MOTOR</Symbol>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Down, Left, Right</ChosenConnection>
</LadderEntity>
```

### Element Types

| ElementType | Description | Usage |
|-------------|-------------|-------|
| `NormalContact` | Normally Open (NO) contact | Examines ON |
| `NegatedContact` | Normally Closed (NC) contact | Examines OFF |
| `Coil` | Standard output coil | Output |
| `Line` | Horizontal connection | Fill empty columns |

### Connection Types

| ChosenConnection | Meaning |
|------------------|---------|
| `Left, Right` | Through connection (standard) |
| `Down, Left, Right` | Branch start (parallel path begins) |
| `Up, Left` | Branch end (parallel path ends) |
| `Left` | Terminal (output coil, no right connection) |

### Grid Layout

- **Columns 0-9:** Logic elements or Line elements
- **Column 10:** Output coil ONLY
- **Row 0:** Main logic path
- **Row 1+:** Parallel branches (seal-in, OR logic)

---

## Lessons Learned

### The .smbp Format is Strict XML

**Does NOT tolerate:**
- XML comments (`<!-- -->`) inside data sections
- Extra elements not in the original schema
- Text content in elements that should be empty
- Missing required elements

### Edit Tool Best Practices

1. **Always read the file first** to understand the exact structure
2. **Match the original format exactly** - whitespace, empty tags, element order
3. **Do not add XML comments** inside data sections
4. **Test after each edit** by opening in the target software
5. **Use empty tags** (`<Comment />`) instead of removing elements

### Debugging Process

1. Read error screenshots to understand the failure
2. Compare working vs non-working XML structure
3. Remove additions one by one to isolate the problem
4. Match the original file format exactly

---

## Final Working Structure

### Rung 1: Motor Control with Safety

```
    START     STOP      ESTOP    OVERLOAD              MOTOR_RUN
 |----[ ]------[/]-------[/]-------[/]---------------( )---|
 |   %I0.0    %I0.1     %I0.2     %I0.3              %Q0.0 |
 |                                                         |
 |  MOTOR_RUN                                              |
 |----[ ]--------+                                         |
     %Q0.0       |_________________________________________|
```

### Rung 2: Alarm Logic

```
    ESTOP                                            ALARM
 |----[ ]----------------------------------------( )---|
 |   %I0.2                                       %Q0.1 |
 |                                                     |
 |  OVERLOAD                                           |
 |----[ ]--------+                                     |
     %I0.3       |_____________________________________|
```

---

## Version History

- **v1.0** (2025-12-25): Initial documentation of editing process

---

**PLCAutoPilot | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
