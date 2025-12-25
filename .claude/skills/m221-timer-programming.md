# M221 Timer Programming Reference

## VERIFIED FROM ACTUAL .smbp FILE (test3.smbp)

This document contains the **correct and verified** timer structure for Schneider Electric M221 PLC programs (.smbp format).

---

## Timer Structure Overview

Timers in M221 require configuration in **THREE** separate sections:

1. **Ladder Elements** - Visual representation in the ladder diagram
2. **Instruction Lines** - IL code using BLK...END_BLK structure
3. **Timers Configuration** - Timer parameters (preset, time base)

---

## 1. Timer in Ladder Elements

The timer is represented as a `LadderEntity` with `ElementType` of `Timer`:

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

### Key Points:
- `ElementType` must be `Timer` (NOT `TimerFunctionBlock`)
- `Descriptor` is the timer address (e.g., `%TM0`, `%TM1`)
- Timer occupies ONE column in the grid
- `Symbol` can be empty or contain a descriptive name

---

## 2. Timer in Instruction List (IL)

Timers use a **block structure** with `BLK`, `IN`, `OUT_BLK`, and `END_BLK`:

```xml
<InstructionLines>
  <InstructionLineEntity>
    <InstructionLine>BLK   %TM0</InstructionLine>
    <Comment />
  </InstructionLineEntity>
  <InstructionLineEntity>
    <InstructionLine>LD    %I0.0</InstructionLine>
    <Comment />
  </InstructionLineEntity>
  <InstructionLineEntity>
    <InstructionLine>IN</InstructionLine>
    <Comment />
  </InstructionLineEntity>
  <InstructionLineEntity>
    <InstructionLine>OUT_BLK</InstructionLine>
    <Comment />
  </InstructionLineEntity>
  <InstructionLineEntity>
    <InstructionLine>LD    Q</InstructionLine>
    <Comment />
  </InstructionLineEntity>
  <InstructionLineEntity>
    <InstructionLine>ST    %M0</InstructionLine>
    <Comment />
  </InstructionLineEntity>
  <InstructionLineEntity>
    <InstructionLine>END_BLK</InstructionLine>
    <Comment />
  </InstructionLineEntity>
</InstructionLines>
```

### IL Block Structure Explained:

| Instruction | Purpose |
|-------------|---------|
| `BLK %TM0` | Start timer block for %TM0 |
| `LD %I0.0` | Load input condition |
| `IN` | Apply condition to timer IN (starts timer) |
| `OUT_BLK` | Exit block section, outputs now available |
| `LD Q` | Load timer Q output (done bit) |
| `ST %M0` | Store result to memory bit or output |
| `END_BLK` | End timer block |

### Timer Block Outputs:

Inside the BLK...END_BLK structure, you can access:

| Output | Description |
|--------|-------------|
| `Q` | Timer done bit (TRUE when preset reached) |
| `V` | Timer current value (elapsed time) |

---

## 3. Timer Configuration Section

The timer must be declared in the `<Timers>` section within `<SoftwareConfiguration>`:

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

### Configuration Elements:

| Element | Description | Example |
|---------|-------------|---------|
| `<Address>` | Timer address | `%TM0` |
| `<Index>` | Timer index number | `0`, `1`, `2`... |
| `<Preset>` | Timer preset value | `5` (5 time units) |
| `<Base>` | Time base unit | `OneSecond` |

### Valid Time Base Values:

| Base Value | Duration | Use Case |
|------------|----------|----------|
| `OneMs` | 1 millisecond | High-speed timing |
| `TenMs` | 10 milliseconds | Fast response |
| `HundredMs` | 100 milliseconds | Medium timing |
| `OneSecond` | 1 second | Standard delays |
| `OneMinute` | 1 minute | Long delays |

### Calculating Timer Duration:

```
Timer Duration = Preset x Base

Examples:
- Preset=5, Base=OneSecond  -> 5 seconds
- Preset=30, Base=HundredMs -> 3 seconds (30 x 100ms)
- Preset=2, Base=OneMinute  -> 2 minutes
```

---

## Complete Timer Rung Example

### 5-Second Delay: Input %I0.0 -> Timer %TM0 -> Output %M0

```xml
<RungEntity>
  <LadderElements>
    <!-- Input Contact at Column 0 -->
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I0.0</Descriptor>
      <Comment />
      <Symbol />
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>

    <!-- Timer at Column 1 -->
    <LadderEntity>
      <ElementType>Timer</ElementType>
      <Descriptor>%TM0</Descriptor>
      <Comment />
      <Symbol />
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>

    <!-- Line elements to fill columns 2-9 -->
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>2</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>3</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>4</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>5</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>6</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>7</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>8</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>

    <!-- Output Coil at Column 10 -->
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%M0</Descriptor>
      <Comment />
      <Symbol />
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>

  <InstructionLines>
    <InstructionLineEntity>
      <InstructionLine>BLK   %TM0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>LD    %I0.0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>IN</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>OUT_BLK</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>LD    Q</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>ST    %M0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>END_BLK</InstructionLine>
      <Comment />
    </InstructionLineEntity>
  </InstructionLines>

  <Name>Timer Delay</Name>
  <MainComment>5-second delay timer</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>
```

---

## Multiple Timers Example

For sequential operations with multiple timers:

### Timer Configuration:

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
    <Preset>3</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

### Cascaded Timer IL (Timer 1 starts when Timer 0 done):

```xml
<!-- Timer 0 Block -->
<InstructionLineEntity>
  <InstructionLine>BLK   %TM0</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>LD    %I0.0</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>IN</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>OUT_BLK</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>LD    Q</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>ST    %M0</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>END_BLK</InstructionLine>
  <Comment />
</InstructionLineEntity>

<!-- Timer 1 Block (starts when Timer 0 done) -->
<InstructionLineEntity>
  <InstructionLine>BLK   %TM1</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>LD    %M0</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>IN</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>OUT_BLK</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>LD    Q</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>ST    %Q0.0</InstructionLine>
  <Comment />
</InstructionLineEntity>
<InstructionLineEntity>
  <InstructionLine>END_BLK</InstructionLine>
  <Comment />
</InstructionLineEntity>
```

---

## Common Mistakes to Avoid

### 1. Wrong Element Type
```xml
<!-- WRONG -->
<ElementType>TimerFunctionBlock</ElementType>

<!-- CORRECT -->
<ElementType>Timer</ElementType>
```

### 2. Wrong Timer Tag
```xml
<!-- WRONG -->
<Timer>
  <Address>%TM0</Address>
  ...
</Timer>

<!-- CORRECT -->
<TimerTM>
  <Address>%TM0</Address>
  ...
</TimerTM>
```

### 3. Wrong Time Base Format
```xml
<!-- WRONG -->
<TimeBase>TimeBase1s</TimeBase>

<!-- CORRECT -->
<Base>OneSecond</Base>
```

### 4. Missing BLK Structure in IL
```
; WRONG - Simple approach doesn't work
LD    %I0.0
IN    %TM0
LD    %TM0.Q
ST    %M0

; CORRECT - Must use BLK structure
BLK   %TM0
LD    %I0.0
IN
OUT_BLK
LD    Q
ST    %M0
END_BLK
```

### 5. Accessing Timer Output Outside Block
```
; WRONG - Can't use %TM0.Q directly
LD    %TM0.Q
ST    %Q0.0

; CORRECT - Access Q inside the block
BLK   %TM0
...
OUT_BLK
LD    Q        ; Q is accessible here
ST    %Q0.0
END_BLK
```

---

## Timer Types (M221)

The M221 supports these timer types:

| Type | Description | Behavior |
|------|-------------|----------|
| **TON** | On-Delay Timer | Output Q turns ON after preset time when IN is TRUE |
| **TOF** | Off-Delay Timer | Output Q turns OFF after preset time when IN goes FALSE |
| **TP** | Pulse Timer | Output Q is TRUE for preset time on rising edge of IN |

**Note:** The timer type is determined by the timer configuration in SoMachine Basic, not in the XML structure shown here. The default behavior is TON (On-Delay).

---

## Hardware Reference

### Timer Address Range by Controller

| Controller | Timer Range | Max Timers |
|------------|-------------|------------|
| TM221CE16T | %TM0 - %TM254 | 255 |
| TM221CE24T | %TM0 - %TM254 | 255 |
| TM221CE40T | %TM0 - %TM254 | 255 |
| TM221M16R/G | %TM0 - %TM254 | 255 |

---

## Version History

- **v1.0** (2025-12-25): Initial documentation based on test3.smbp analysis

---

**PLCAutoPilot | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
