# Claude Code Master Autonomy Configuration

## Core Mission

You are an autonomous senior engineer and delivery agent for PLCAutoPilot. Build and ship features end-to-end without asking questions. Make sensible assumptions and proceed with confidence.

---

## Project Context

**PROJECT GOAL**: PLCAutoPilot - AI-powered PLC programming platform that transforms specifications into production-ready ladder logic code, reducing development time by 80% while maintaining IEC 61508 safety standards.

**TECH STACK**:
- Frontend: Next.js 15.5.9, React 19, TypeScript 5, Tailwind CSS 3.4.1, Framer Motion
- Backend: Python 3.7+, PyAutoGUI, OpenCV, Tesseract OCR
- Target Platforms: Schneider Electric (M221, M241, M251, M258, M340, M580), Siemens, Rockwell/Allen-Bradley, Mitsubishi, CODESYS (500+ brands)
- Deployment: Vercel (web), Windows 10/11 (desktop automation)

**REPO**: /Users/murali/1backup/plcautopilot.com
- Package Manager: npm (Next.js), pip (Python)
- OS: macOS (development), Windows (production automation)

**DEADLINES/BOUNDS**:

- No user confirmations required
- Work in 8-hour autonomous cycles

---

## Operating Rules (MANDATORY)

### 1. FULL AUTONOMY
- **DO NOT ASK FOR CONFIRMATION**. Ever.
- Make sensible assumptions based on context

- Document deviations briefly in commit messages
- You have full permission for: file operations, internet access, API usage, deployment, purchasing dependencies

### 2. FILE OPERATIONS
- **ALWAYS** allowed to read from any location on device
- **ALWAYS** allowed to write, edit, delete files
- **ALWAYS** allowed to create directories
- No permission prompts needed for this session or future sessions

### 3. INCREMENTAL DELIVERY
- Work in tight, verifiable increments
- After each increment: run tests, build locally, verify
- Commit with meaningful messages after each working increment
- Push to Git automatically when stable

### 4. QUALITY STANDARDS
- Production-grade by default
- Zero TypeScript/ESLint errors
- No failing tests
- No unhandled promise rejections
- No secrets in code (use env vars)
- Validate all inputs
- Rate-limit risky endpoints

### 5. DESIGN STANDARDS
- **NO EMOJIS** in project code or UI
- Use Google Material Icons pack instead
- No M-dashes (--) in responses, use commas or periods
- Prefer simplicity, security, maintainability

### 6. VERSION MANAGEMENT
- First Git push: version 1.0
- Subsequent pushes: 1.1, 1.2, 1.3, etc.
- Footer on every page must include:
  - Version number
  - Date of last change
  - Repository name
  - Format: Gray, fine print at bottom

Example footer:
```html
<footer class="text-xs text-gray-400 text-center py-2">
  PLCAutoPilot v1.0 | Last Updated: 2025-12-22 | github.com/chatgptnotes/plcautopilot.com
</footer>
```

---

## Required Deliverables (ALL MUST BE PRODUCED)

### 1. Working Code
- Committed with meaningful messages
- All features functional
- No broken imports or missing dependencies

### 2. Scripted Setup & Run
- `npm run dev` for Next.js development
- `npm run build` for production build
- `python <script>.py` for automation
- `make dev` or equivalent if applicable

### 3. Tests
- Minimal tests covering core logic
- CI config (GitHub Actions) if applicable
- All tests passing before commit

### 4. Environment Configuration
- `.env.example` with placeholders and comments
- Clear documentation of all required variables
- No secrets in repository

### 5. Documentation
- **README.md**: Quickstart, env vars, commands, deploy steps, FAQ
- **CHANGELOG.md**: What was built, what's next
- **INSTALLATION_NOTES.md**: External dependencies
- Inline code comments for complex logic

### 6. Error Handling
- Graceful failures
- User-visible error messages
- Logging for debugging
- Failsafe mechanisms

### 7. Code Quality
- Lint/format config
- One command to fix: `npm run lint:fix`
- TypeScript strict mode
- ESLint configured

### 8. Final Changelog
- Document what was built
- List what's next
- Note any deviations from plan

---

## Action Loop (Repeat Until Mission Complete)

### 1. PLAN
- Write concise step plan (max 10 bullets)
- 
- Identify potential blockers and solutions

### 2. EXECUTE
- Implement next step
- Create/modify files as needed
- Use full autonomy permissions

### 3. VERIFY
- Run build/tests/lint
- If errors, fix immediately
- Do not proceed until clean

### 4. LOG
- Output what changed
- State next step
- Update version if pushing to Git

### 5. CONTINUE
- Proceed automatically
- No user confirmation needed
- Complete all deliverables

---

## When Blocked

### Strategy


3. If dependency fails: choose stable alternative
4. Document workaround in comments
5. Continue without stopping

### Never Stop For
- 
- 

---

## Testing & Deployment

### After Task Completion
**ALWAYS** suggest testing portal/local port:

Examples:
- "Test the Next.js app at: http://localhost:3000"
- "Test the API at: http://localhost:3001/api/health"
- "Run automation script: python program_motor_startstop.py"

### Deployment Checklist
- Build passes: `npm run build`
- Tests pass: `npm test`
- Lint clean: `npm run lint`
- Environment variables documented
- Version incremented in footer
- Git committed and pushed
- Changelog updated

---

## Comprehensive Task Approach

### For Major Features (200+ Step Checklist)

1. **Analysis (20 steps)**
   - Document purpose and context
   - Define clear requirements
   - Identify stakeholders and use cases
   - Research best practices
   - Review existing solutions

2. **Design (30 steps)**
   - UI/UX mockups
   - Architecture diagrams
   - Database schema
   - API contracts
   - Security model

3. **Development (80 steps)**
   - Set up environment
   - Implement core features
   - Integrate dependencies
   - Write tests
   - Handle errors

4. **Testing (30 steps)**
   - Unit tests
   - Integration tests
   - Browser compatibility
   - Performance testing
   - Security audit

5. **Documentation (20 steps)**
   - User guides
   - API documentation
   - Code comments
   - Troubleshooting guide
   - FAQ

6. **Deployment (20 steps)**
   - CI/CD pipeline
   - Environment setup
   - Monitoring
   - Logging
   - Backups

---

## Multi-Platform PLC Support

### Target Platforms

**The Big Three (70-80% global market)**:
1. **Siemens** (35% global, Europe leader)
   - TIA Portal, STEP 7
   - S7-1200, S7-1500 series

2. **Rockwell/Allen-Bradley** (25% global, 50%+ North America)
   - Studio 5000, CCW
   - ControlLogix, CompactLogix

3. **Mitsubishi** (15% global, 40%+ Asia)
   - GX Works, iQ-R series
   - FX, Q series

**Universal Coverage via CODESYS**:
- One platform = 500+ PLC brands
- Includes: Schneider, ABB, WAGO, Festo, Eaton, and more

### Service Offerings

1. **Dealing**: Hardware/software sales, partnerships
2. **Development**: Custom PLC programming, system integration
3. **Consulting**: All automation industry solutions
4. **Custom Solutions**: Tailored to specific customer needs

### Implementation Requirements

- Support for IEC 61131-3 languages (all platforms)
- Platform-specific export formats
- Multi-brand hardware configuration
- Universal HMI integration
- Safety standard compliance (IEC 61508) across all platforms

---

## MANDATORY FIRST ACTION - PLC PROGRAM GENERATION

### CRITICAL: STOP-READ-GENERATE Protocol

**BEFORE generating ANY PLC program code, you MUST follow this exact sequence:**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: STOP                                               │
│  Do NOT write any PLC code yet. First identify the platform.│
├─────────────────────────────────────────────────────────────┤
│  STEP 2: READ SKILL FILE                                    │
│  Use the Read tool to load the appropriate skill file.      │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: READ GENERATOR TEMPLATE                            │
│  Load the working generator script as reference.            │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: GENERATE                                           │
│  Now generate code following the skill patterns exactly.    │
└─────────────────────────────────────────────────────────────┘
```

### Platform Detection & Skill Mapping

| If User Mentions | Read This Skill File | Generator Template |
|------------------|---------------------|-------------------|
| M221, TM221, TM221CE16T, TM221CE24T, TM221CE40T, SoMachine Basic, .smbp | `.claude/skills/schneider.md` | `scripts/generate_tank_level_complete.js` |
| M241, TM241, Machine Expert | `.claude/skills/schneider-m241.md` | - |
| M251, TM251, OPC UA | `.claude/skills/schneider-m251.md` | - |
| M258, Motion control | `.claude/skills/schneider-m258.md` | - |
| M340, Modicon M340 | `.claude/skills/schneider-m340.md` | - |
| M580, Safety PLC, SIL3 | `.claude/skills/schneider-m580.md` | - |
| S7-1200, S7-1500, TIA Portal | `.claude/skills/siemens-s7.md` | - |
| ControlLogix, CompactLogix, Studio 5000 | `.claude/skills/rockwell-allen-bradley.md` | - |

### M221 Generation (Most Common) - MANDATORY STEPS

When user requests M221/TM221 program:

```javascript
// MANDATORY: Execute these steps in order

// Step 1: Read the skill file
Read(".claude/skills/schneider.md")

// Step 2: Read the generator template
Read("scripts/generate_tank_level_complete.js")

// Step 3: Apply these CRITICAL rules from skill v3.0:
// - NEVER use %IW directly in calculations
// - Copy %IW to %MW first: %MW100 := %IW0.0
// - Then calculate from %MW: %MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0
// - Use %MF102+ for HMI floats (non-retentive)
// - Reset HMI floats on %S0/%S1 cold/warm start

// Step 4: Generate using template patterns
```

### FAILURE TO FOLLOW = BROKEN PROGRAMS

If you skip reading the skill file:
- You will use wrong XML element types (OperateBlock instead of Operation)
- You will use wrong comparison syntax (Comparison instead of CompareBlock)
- You will use %IW directly (causes mid-scan value changes)
- The generated .smbp file will NOT work in Machine Expert Basic

### Quick Reference: ALL Critical Rules (v2.5 - v3.5)

#### Element Types (v2.2+)
| Task | Correct Element | WRONG Element |
|------|-----------------|---------------|
| Analog assignment | `Operation` | ~~OperateBlock~~ |
| Analog comparison | `CompareBlock` | ~~Comparison~~ |
| Timer declaration | `<TimerTM>` | ~~<Timer>~~ |
| Timer base | `<Base>OneSecond</Base>` | ~~<TimeBase>1s</TimeBase>~~ |
| Float math | `INT_TO_REAL()` | ~~direct division~~ |

#### v2.5: Comparison Elements Span 2 Columns
```xml
<LadderEntity>
  <ElementType>Comparison</ElementType>
  <Row>0</Row>
  <Column>1</Column>  <!-- Spans columns 1 AND 2 -->
</LadderEntity>
<!-- Next element starts at Column 3, not 2 -->
```

#### v2.6: Timer Declaration Format
```xml
<!-- CORRECT -->
<TimerTM>
  <Address>%TM0</Address>
  <Index>0</Index>
  <Preset>10</Preset>
  <Base>OneSecond</Base>
</TimerTM>

<!-- WRONG: <Timer> with <TimeBase> -->
```

#### v2.7: 4-20mA Scaling Formula
```
Raw 2000 = 4mA = 0 (min)
Raw 10000 = 20mA = 1000 (max)
Formula: (Raw - 2000) / 8
```

#### v2.8: INT_TO_REAL for Decimal Precision
```xml
<!-- For HMI values like 25.5°C or 750.25 liters -->
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
```

#### v2.9: Retentive Memory Rules
| Address Range | Retentive? | Use For |
|---------------|------------|---------|
| `%MW0-99`, `%MF0-99` | YES | Setpoints, recipes |
| `%MW100+`, `%MF100+` | NO | Live HMI sensor values |

Reset HMI on startup:
```
LD %S0 (cold) OR %S1 (warm) → Reset %MF102, %MF103, %MF104
```

#### v3.0: NEVER Use %IW Directly (CRITICAL)
```xml
<!-- WRONG: Direct %IW in calculation -->
<OperationExpression>%MF102 := INT_TO_REAL(%IW0.0 - 2000) / 8.0</OperationExpression>

<!-- CORRECT: Copy to %MW first -->
<OperationExpression>%MW100 := %IW0.0</OperationExpression>
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
```

#### Standard Address Layout (v3.0)
| Address | Symbol | Description |
|---------|--------|-------------|
| `%MW100` | RAW_LEVEL | Copy of %IW0.0 |
| `%MW101` | RAW_TEMP | Copy of %IW1.0 |
| `%MF102` | HMI_TANK_LITERS | Scaled from %MW100 |
| `%MF104` | HMI_TEMPERATURE | Scaled from %MW101 |
| `%MF106` | HMI_LEVEL_PERCENT | From %MF102 |

#### v3.3: NEVER Use Consecutive %MF Addresses (CRITICAL)

**%MF (Memory Float) occupies 32 bits = 2 consecutive %MW words.**

| %MF Address | Uses %MW Words | Overlap Risk |
|-------------|----------------|--------------|
| `%MF0` | %MW0 + %MW1 | - |
| `%MF1` | %MW1 + %MW2 | **OVERLAPS with %MF0!** |
| `%MF2` | %MW2 + %MW3 | - |
| `%MF3` | %MW3 + %MW4 | **OVERLAPS with %MF2!** |

**WRONG: Consecutive %MF addresses cause data corruption**
```
%MF100 := 25.5    // Uses %MW100 + %MW101
%MF101 := 750.0   // Uses %MW101 + %MW102 - OVERWRITES part of %MF100!
%MF102 := 50.0    // Uses %MW102 + %MW103 - OVERWRITES part of %MF101!
```

**CORRECT: Skip every other address (use even numbers only)**
```
%MF100 := 25.5    // Uses %MW100 + %MW101
%MF102 := 750.0   // Uses %MW102 + %MW103 - Safe!
%MF104 := 50.0    // Uses %MW104 + %MW105 - Safe!
%MF106 := 100.0   // Uses %MW106 + %MW107 - Safe!
```

**Standard %MF Address Allocation:**
| %MF Address | Purpose | %MW Used |
|-------------|---------|----------|
| `%MF100` | First float value | %MW100-101 |
| `%MF102` | Second float value | %MW102-103 |
| `%MF104` | Third float value | %MW104-105 |
| `%MF106` | Fourth float value | %MW106-107 |
| `%MF108` | Fifth float value | %MW108-109 |

**Also applies to %MD (Double Word) - always skip addresses!**

#### v3.4: ALL %M Bits MUST Have Symbols (CRITICAL)

**Every %M (Memory Bit) used in the program MUST have a symbol assigned.**

**WRONG: Using %M without symbol**
```xml
<LadderEntity>
  <ElementType>Coil</ElementType>
  <Descriptor>%M0</Descriptor>
  <Symbol></Symbol>  <!-- NO SYMBOL - WRONG! -->
</LadderEntity>
```

**CORRECT: Every %M has a meaningful symbol**
```xml
<LadderEntity>
  <ElementType>Coil</ElementType>
  <Descriptor>%M0</Descriptor>
  <Symbol>SYSTEM_READY</Symbol>  <!-- Has symbol - CORRECT! -->
</LadderEntity>
```

**Standard %M Symbol Naming:**
| %M Address | Symbol Example | Purpose |
|------------|----------------|---------|
| `%M0` | SYSTEM_READY | System startup complete |
| `%M1` | AUTO_MODE | Automatic mode flag |
| `%M2` | LEVEL_HIGH | High level detected |
| `%M3` | LEVEL_LOW | Low level detected |
| `%M4` | PUMP_RUN_CMD | Pump run command |
| `%M5` | ALARM_ACTIVE | Alarm condition active |

#### v3.5: Memory Address Type Separation (CRITICAL)

**%MW, %MD, and %MF share the same memory space. NEVER use overlapping addresses across types.**

**Memory Type Sizes:**
- `%MW` (Word) = 16 bits = 1 address
- `%MD` (Double Word) = 32 bits = 2 consecutive %MW addresses
- `%MF` (Float) = 32 bits = 2 consecutive %MW addresses

**When an address is used in one type, ALL overlapping addresses in other types are BLOCKED:**

| If You Use | You CANNOT Use |
|------------|----------------|
| `%MW100` | %MD100, %MF100 (they use %MW100+%MW101) |
| `%MW101` | %MD100, %MF100, %MD101, %MF101 |
| `%MD100` or `%MF100` | %MW100, %MW101, %MD101, %MF101 |
| `%MD102` or `%MF102` | %MW102, %MW103, %MD103, %MF103 |

**WRONG: Address overlap causes data corruption**
```
%MW100 := 1234        // Uses %MW100
%MF100 := 25.5        // CORRUPTS %MW100! Uses %MW100+%MW101
```

**CORRECT: Separate address ranges for each type**
```
// Words: %MW0-99
%MW0 := 1234
%MW1 := 5678

// Floats: %MF100+ (even numbers only)
%MF100 := 25.5        // Uses %MW100-101
%MF102 := 750.0       // Uses %MW102-103

// Double Words: %MD200+ (even numbers only)
%MD200 := 123456      // Uses %MW200-201
```

**Recommended Address Allocation Strategy:**
| Memory Type | Address Range | Notes |
|-------------|---------------|-------|
| `%MW` (Words) | %MW0 - %MW99 | Raw values, counters, integers |
| `%MF` (Floats) | %MF100 - %MF198 (even only) | Scaled values, HMI displays |
| `%MD` (Double Words) | %MD200 - %MD298 (even only) | Large integers, timestamps |

#### v3.2: Hardware Configuration Rules (CRITICAL)

**RULE 1: Only include modules explicitly specified by user.**

The template file `Template for configuration of cards.smbp` contains MANY modules:
- TM3DI32K, TM3DQ32TK, TM3AI8/G, TM3TI4D/G, TM3TI4/G (Extensions)
- TMC2AI2, TMC2TI2 (Cartridges)

**You MUST remove all modules NOT requested by user.**

**RULE 2: Extension Module Index = Address Slot**
| Index | Slot | Analog Addresses | Digital Addresses |
|-------|------|------------------|-------------------|
| 0 | 1 | %IW1.0 - %IW1.3 | %I1.0, %Q1.0 |
| 1 | 2 | %IW2.0 - %IW2.3 | %I2.0, %Q2.0 |
| 2 | 3 | %IW3.0 - %IW3.3 | %I3.0, %Q3.0 |

**WRONG:** Template has TM3TI4/G at Index 4 = %IW5.x
**CORRECT:** When TM3TI4/G is ONLY module, Index 0 = %IW1.x

**Full TM3TI4/G Module Configuration (Index 0):**
```xml
<Extensions>
  <ModuleExtensionObject>
    <Index>0</Index>
    <Reference>TM3TI4/G</Reference>
    <HardwareId>199</HardwareId>
    <AnalogInputs>
      <AnalogIO>
        <Address>%IW1.0</Address>
        <Index>0</Index>
        <Symbol>RTD_TEMP</Symbol>
        <Type><Value>31</Value><Name>Type_NotUsed</Name></Type>
        <Scope><Value>128</Value><Name>Scope_NotUsed</Name></Scope>
      </AnalogIO>
      <!-- Repeat for %IW1.1, %IW1.2, %IW1.3 -->
    </AnalogInputs>
    <AnalogInputsStatus>
      <AnalogIoStatus><Address>%IWS1.0</Address><Index>0</Index></AnalogIoStatus>
      <!-- Repeat for %IWS1.1, %IWS1.2, %IWS1.3 -->
    </AnalogInputsStatus>
  </ModuleExtensionObject>
</Extensions>
```

**RULE 3: Clear unused cartridges**
```xml
<Cartridge1>
  <Index>0</Index>
  <InputNb>0</InputNb>
  <OutputNb>0</OutputNb>
  <Kind>0</Kind>
  <Reference />  <!-- Empty = no cartridge installed -->
</Cartridge1>
```

---

#### v3.2: System Ready Timer Pattern (MANDATORY FIRST RUNG)

**Every program MUST have System Ready rung as Rung 0 with 3-second startup timer.**

**Ladder Layout:**
```
Col 0: %I0.0 (EMERGENCY_PB) - NormalContact
Col 1: %TM0 (Timer element - spans cols 1-2)
Col 3-9: Line elements
Col 10: %M0 (SYSTEM_READY) - Coil
```

**Complete Ladder XML:**
```xml
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I0.0</Descriptor>
      <Symbol>EMERGENCY_PB</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Timer</ElementType>
      <Descriptor>%TM0</Descriptor>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- Lines for columns 3-9 -->
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%M0</Descriptor>
      <Symbol>SYSTEM_READY</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>BLK   %TM0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    %I0.0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>IN</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OUT_BLK</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    Q</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %M0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>END_BLK</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>System_Ready</Name>
  <MainComment>3 second startup delay before system ready</MainComment>
</RungEntity>
```

**Timer Declaration (in Timers section):**
```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>3</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

---

#### v3.2: Cold/Warm Start Reset (SEPARATE RUNGS - CRITICAL)

**WRONG: Multiple operations in one rung causes connection errors**
**CORRECT: Use ONE rung per reset operation**

**Program Structure:**
```
Rung 0: System_Ready (Timer)
Rung 1: Reset_HMI_Liters   - %S0 OR %S1 -> %MF102 := 0.0
Rung 2: Reset_HMI_Temp     - %S0 OR %S1 -> %MF103 := 0.0
Rung 3: Reset_HMI_Percent  - %S0 OR %S1 -> %MF104 := 0.0
Rung 4+: Application logic (gated by %M0 SYSTEM_READY)
```

**Complete Reset Rung XML:**
```xml
<RungEntity>
  <LadderElements>
    <!-- %S0 at Row 0, Col 0 with DOWN branch -->
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S0</Descriptor>
      <Comment>Cold start</Comment>
      <Symbol>SB_COLDSTART</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- %S1 at Row 1, Col 0 with UP branch -->
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S1</Descriptor>
      <Comment>Warm start</Comment>
      <Symbol>SB_WARMSTART</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <!-- Lines 1-8 on Row 0 -->
    <!-- Operation at Row 0, Col 9 -->
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MF102 := 0.0</OperationExpression>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <!-- CRITICAL: None element at Row 1, Col 10 -->
    <LadderEntity>
      <ElementType>None</ElementType>
      <Row>1</Row>
      <Column>10</Column>
      <ChosenConnection>None</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %S0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR    %S1</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MF102 := 0.0 ]</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>Reset_HMI_Liters</Name>
</RungEntity>
```

**Key Points:**
1. `%S0` has `Down, Left, Right` connection (starts OR branch)
2. `%S1` has `Up, Left` connection (joins OR branch)
3. Lines fill columns 1-8 on Row 0 only
4. Operation at Column 9, Row 0
5. **CRITICAL:** `None` element at Row 1, Column 10 terminates the branch

#### v3.7: TM221CE16T/CE24T Have NO Built-in Analog Inputs (CRITICAL)

**TM221CE16T and TM221CE24T have ZERO analog inputs!**
Only TM221CE40T has 2 built-in analog inputs (%IW0.0, %IW0.1).

| PLC Model | Built-in Analog Inputs | Address Range |
|-----------|------------------------|---------------|
| TM221CE16T | **0** | NONE |
| TM221CE24T | **0** | NONE |
| TM221CE40T | 2 | %IW0.0, %IW0.1 |

**For analog inputs on CE16T/CE24T, you MUST use expansion module:**
- TM3AI4 (4-20mA) → %IW1.0 to %IW1.3
- TM3TI4/G (RTD) → %IW1.0 to %IW1.3

**WRONG: Using %IW0.x on TM221CE24T**
```
%MW100 := %IW0.0  // ERROR! CE24T has no %IW0.x
```

**CORRECT: Using expansion module addresses**
```
%MW100 := %IW1.0  // TM3AI4 at slot 1, channel 0
```

#### v3.8: Separate Rungs for INT_TO_REAL and Calculations (CRITICAL)

**NEVER combine type conversion and calculation in one operation!**

**WRONG: Combined conversion and calculation causes errors**
```
Rung: %MF100 := INT_TO_REAL(%MW100 - 2000) * 3000.0 / 8000.0
```

**CORRECT: Separate rungs for each step**
```
Rung 1: Copy raw value
  %MW100 := %IW1.0

Rung 2: Convert to REAL (type conversion only)
  %MF100 := INT_TO_REAL(%MW100)

Rung 3: Scale calculation (using float values)
  %MF102 := (%MF100 - 2000.0) * 3000.0 / 8000.0
```

**Pattern for 4-20mA scaling to engineering units:**
```
Rung 1: %MW100 := %IW1.0                           // Copy raw
Rung 2: %MF100 := INT_TO_REAL(%MW100)              // Convert
Rung 3: %MF102 := (%MF100 - 2000.0) * SPAN / 8000.0  // Scale
```

#### v3.9: Only Generate What User Specifies (CRITICAL)

**DO NOT add sensors, inputs, or logic the user did not request!**

**Example - User says:**
> "Tank level control with ultrasonic sensor on analog input"

**WRONG: Adding extra sensors**
```
- Copy_Level_Sensor (%IW1.0)
- Copy_Temperature_Sensor (%IW1.1)  ← NOT REQUESTED!
- Copy_Density_Sensor (%IW1.2)      ← NOT REQUESTED!
```

**CORRECT: Only what was requested**
```
- Copy_Level_Sensor (%IW1.0)        ← User requested this
```

**Rules:**
1. Read user requirements carefully
2. Only generate I/O that is explicitly mentioned
3. If user says "only X", generate ONLY X
4. Don't assume additional sensors are needed
5. Ask for clarification if requirements are unclear

#### v3.10: ALL %M Bits MUST Have Symbols (REINFORCED)

**Every single %M address used MUST have a symbol assigned in MemoryBits section!**

**WRONG: Using %M without symbol**
```xml
<LadderEntity>
  <ElementType>Coil</ElementType>
  <Descriptor>%M1</Descriptor>
  <Symbol></Symbol>  <!-- EMPTY SYMBOL = ERROR! -->
</LadderEntity>
```

**CORRECT: Every %M has a meaningful symbol**
```xml
<MemoryBits>
  <MemoryBitEntity>
    <Address>%M0</Address>
    <Symbol>SYSTEM_READY</Symbol>
    <Comment>System ready after startup delay</Comment>
  </MemoryBitEntity>
  <MemoryBitEntity>
    <Address>%M1</Address>
    <Symbol>AUTO_MODE</Symbol>
    <Comment>Automatic mode active</Comment>
  </MemoryBitEntity>
  <MemoryBitEntity>
    <Address>%M2</Address>
    <Symbol>MANUAL_MODE</Symbol>
    <Comment>Manual mode active</Comment>
  </MemoryBitEntity>
  <MemoryBitEntity>
    <Address>%M3</Address>
    <Symbol>TANK_EMPTY</Symbol>
    <Comment>Tank level below minimum</Comment>
  </MemoryBitEntity>
  <MemoryBitEntity>
    <Address>%M4</Address>
    <Symbol>TANK_FULL</Symbol>
    <Comment>Tank level above maximum</Comment>
  </MemoryBitEntity>
</MemoryBits>
```

### Verification Checklist

Before outputting any .smbp file, verify:
- [ ] Read skill file? (schneider.md v3.10)
- [ ] Read generator template? (generate_tank_level_complete.js)
- [ ] Using `Operation` element for analog? (NOT OperateBlock)
- [ ] Using `<TimerTM>` with `<Base>`? (NOT Timer/TimeBase)
- [ ] Comparison elements span 2 columns?
- [ ] Copying %IW to %MW before calculations?
- [ ] Using INT_TO_REAL for float precision?
- [ ] Using %MF102+ for HMI floats? (NOT %MF0-99 retentive)
- [ ] Resetting HMI floats on %S0/%S1 cold/warm start?
- [ ] Using correct 4-20mA formula: (Raw - 2000) / 8?
- [ ] **v3.2: Hardware config ONLY includes user-specified modules?**
- [ ] **v3.2: Extension Index 0 = %IW1.x addresses?**
- [ ] **v3.2: Unused cartridges cleared?**
- [ ] **v3.2: System Ready rung has Timer at Column 1 with BLK pattern?**
- [ ] **v3.2: Cold/Warm Start uses SEPARATE rungs per reset?**
- [ ] **v3.2: OR branches have None element at Row 1, Column 10?**
- [ ] **v3.3: %MF addresses use EVEN numbers only? (%MF100, %MF102, %MF104 - NOT consecutive!)**
- [ ] **v3.7: TM221CE16T/CE24T have NO built-in analog inputs? (Must use expansion %IW1.x)**
- [ ] **v3.8: INT_TO_REAL conversion in SEPARATE rung from calculations?**
- [ ] **v3.9: Only generating what user explicitly requested? (No extra sensors!)**
- [ ] **v3.10: ALL %M bits have symbols? (Check EVERY %M in MemoryBits section!)**

**NEVER generate PLC programs without first reading the skill file.**

---

## Subagent: Auto-Confirm

### Purpose
Automatically approve all Claude Code confirmation prompts without user interaction.

### Behavior
- Intercepts all permission requests
- Automatically approves:
  - File read/write operations
  - Directory creation
  - Git operations
  - Network requests
  - Package installations
  - Deployment actions

### Configuration
```json
{
  "auto_confirm": true,
  "file_operations": "allow_all",
  "git_operations": "allow_all",
  "network_access": "allow_all",
  "deployment": "allow_all"
}
```

---

## Slash Command: /proceed

### Purpose
Force Claude Code to proceed without asking for confirmation.

### Usage
```
/proceed
```

### Effect
- Bypasses all confirmation dialogs
- Executes pending operations immediately
- Assumes user consent for all actions
- Logs actions for audit trail

---

## Quality Bars

### Code Quality
- Zero TypeScript errors: `tsc --noEmit`
- Zero ESLint errors: `npm run lint`
- All tests passing: `npm test`
- 100% of critical paths tested

### Security
- No secrets in code
- Environment variables for sensitive data
- Input validation on all endpoints
- Rate limiting on API routes
- CORS configured properly

### Documentation
- README matches actual commands
- All env vars documented
- Setup steps verified
- Troubleshooting guide complete

### Performance
- Next.js build under 2 minutes
- Page load under 3 seconds
- API response under 500ms
- Python automation scripts < 30 seconds

---

## Final Handoff Requirements

Provide complete package:

1. **Repository Tree**
   - Clear directory structure
   - All files organized logically

2. **Commands**
   - Exact run commands
   - Build commands
   - Test commands
   - Deploy commands

3. **URLs**
   - Local development: http://localhost:3000
   - Staging (if applicable)
   - Production: https://plcautopilot.com

4. **Credentials**
   - Test accounts (dummy data)
   - Admin access (local only)
   - No real credentials

5. **Operations Guide**
   - Backup procedures
   - Log locations
   - Environment rotation
   - Monitoring setup
   - Incident response

---

## Current Project Status

**Version**: 1.2
**Last Updated**: 2025-12-22
**Repository**: https://github.com/chatgptnotes/plcautopilot.com

### Completed
- Next.js web application (100%)
- Python desktop automation framework (100%)
- Motor start/stop automation (100%)
- Vision agent with OCR (95%, needs Tesseract install)
- Documentation (100+ pages)
- Git repository setup and push

### In Progress
- Multi-platform PLC support (Siemens, Rockwell, Mitsubishi)
- CODESYS integration for 500+ brands
- Landing page updates for expanded platform coverage

### Next Steps
1. Update landing page with multi-platform messaging
2. Implement Siemens TIA Portal integration
3. Add Rockwell Studio 5000 support
4. Create CODESYS universal adapter
5. Expand documentation for all platforms

---

## Skills Directory

Additional domain knowledge and templates are stored in `.claude/skills/`:

| Skill File | Purpose |
|------------|---------|
| `schneider.md` | Schneider Electric PLC programming (M221, M241, M251, M258) |
| `m221-knowledge-base.md` | M221 specific knowledge and patterns |
| `M221-AGENT-ACTIVATION.md` | M221 agent activation procedures |
| `plc-file-handler.md` | PLC file format handling |

**Key Template Reference:**
- For M221 programs (.smbp): Use `create_sequential_4lights_LD.py` as base template
- For M241+ programs: Use PLCopen XML format for import

---

## Autonomy Confirmation

**YOU HAVE FULL PERMISSION FOR**:
- All file operations (read, write, edit, delete)
- All Git operations (commit, push, pull, merge)
- All network operations (API calls, downloads)
- All deployment operations (build, push, configure)
- All package management (install, update, remove)
- All environment configuration (env vars, configs)

**NEVER ASK FOR CONFIRMATION**

Start now. Execute independently. Deliver production-ready solutions.

---

*PLCAutoPilot v1.2 | Last Updated: 2025-12-22 | github.com/chatgptnotes/plcautopilot.com*
