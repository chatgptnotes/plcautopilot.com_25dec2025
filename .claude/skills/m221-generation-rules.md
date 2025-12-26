# M221 Program Generation Rules

## MANDATORY: Always Follow These Rules

When generating ANY Schneider M221 PLC program (.smbp file):

### 1. Read Skill File First
```
.claude/skills/schneider.md (v2.3+)
```

### 2. Use Correct Element Types

| Task | Element Type | NOT |
|------|--------------|-----|
| Analog assignment | `Operation` | ~~OperateBlock~~ |
| Analog comparison | `CompareBlock` | ~~Comparison~~ |
| Timer | `Timer` | ~~TimerFunctionBlock~~ |
| Counter | `Counter` | ~~CounterFunctionBlock~~ |

### 3. Reference Working Files

For analog applications, reference these verified working files:
- `plc_programs/test_analog_Card_reference.smbp` - Operation element
- `plc_programs/pump_pressure_control_TM221CE24T.smbp` - CompareBlock + TM3AI4

### 4. File Format Requirements

- Encoding: UTF-8 (NO BOM)
- Line endings: CRLF (Windows)
- Extension: .smbp

### 5. TM3AI4 Expansion Module

Prefer Format 2 (ModuleExtensionObject style):
```xml
<Extensions>
  <ModuleExtensionObject>
    <Reference>TM3AI4/G</Reference>
    <AnalogInputs>
      <AnalogIO>
        <Type><Value>3</Value><Name>Type_4_20mA</Name></Type>
        ...
      </AnalogIO>
    </AnalogInputs>
  </ModuleExtensionObject>
</Extensions>
```

### 6. Operation Element Syntax

```xml
<LadderEntity>
  <ElementType>Operation</ElementType>
  <OperationExpression>%MW0 := %IW1.0</OperationExpression>
  <Row>0</Row>
  <Column>9</Column>
  <ChosenConnection>Left</ChosenConnection>
</LadderEntity>
```

IL: `[ %MW0 := %IW1.0 ]`

### 7. CompareBlock Syntax

```xml
<LadderEntity>
  <ElementType>CompareBlock</ElementType>
  <Descriptor>[%IW1.0&gt;2000]</Descriptor>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

IL: `LD    [%IW1.0>2000]`

---

**Last Updated:** 2025-12-26
**Skill Version:** 2.3
