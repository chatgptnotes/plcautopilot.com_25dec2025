/**
 * PLCopenXML Generator for M241/M251/M258 Controllers
 *
 * Generates IEC 61131-3 compliant PLCopenXML files that can be imported
 * into EcoStruxure Machine Expert via Project > Import PLCopenXML...
 *
 * Supports: Ladder Diagram (LD) and Structured Text (ST)
 */

import type {
  PLCopenProject,
  POU,
  Variable,
  LadderDiagram,
  LDRung,
  LDElement,
  StructuredText,
  Configuration,
  Resource,
  Task,
  POUInstance,
  GeneratorResult,
  LanguageType,
  Position,
} from './plcopen-types';

// ============================================================================
// XML Escaping Utility
// ============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate complete PLCopenXML file from a project configuration
 */
export function generatePLCopenXML(project: PLCopenProject): GeneratorResult {
  try {
    const xml = buildXML(project);
    return { success: true, xml };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating PLCopenXML',
    };
  }
}

function buildXML(project: PLCopenProject): string {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0201">
  <fileHeader companyName="${escapeXml(project.fileHeader.companyName || 'PLCAutoPilot')}"
              productName="${escapeXml(project.fileHeader.productName || 'PLCAutoPilot Generator')}"
              productVersion="${escapeXml(project.fileHeader.productVersion || '1.0')}"
              creationDateTime="${project.fileHeader.creationDateTime || now}">
    ${project.fileHeader.contentDescription ? `<contentDescription>${escapeXml(project.fileHeader.contentDescription)}</contentDescription>` : ''}
  </fileHeader>
  <contentHeader name="${escapeXml(project.contentHeader.name)}"
                 version="${escapeXml(project.contentHeader.version || '1.0')}"
                 modificationDateTime="${project.contentHeader.modificationDateTime || now}">
    ${project.contentHeader.author ? `<coordinateInfo><pageSize x="0" y="0"/><fbd><scaling x="1" y="1"/></fbd><ld><scaling x="1" y="1"/></ld><sfc><scaling x="1" y="1"/></sfc></coordinateInfo>` : ''}
  </contentHeader>
  <types>
    <dataTypes/>
    <pous>
${project.types.pous.map(pou => generatePOU(pou)).join('\n')}
    </pous>
  </types>
  <instances>
    <configurations>
${project.instances.configurations.map(config => generateConfiguration(config)).join('\n')}
    </configurations>
  </instances>
</project>`;
}

// ============================================================================
// POU Generation
// ============================================================================

function generatePOU(pou: POU): string {
  const interfaceXml = generateInterface(pou.interface);
  const bodyXml = generateBody(pou.body);

  return `      <pou name="${escapeXml(pou.name)}" pouType="${pou.pouType}">
        ${pou.documentation ? `<documentation><xhtml xmlns="http://www.w3.org/1999/xhtml">${escapeXml(pou.documentation)}</xhtml></documentation>` : ''}
        <interface>
${interfaceXml}
        </interface>
        <body>
${bodyXml}
        </body>
      </pou>`;
}

function generateInterface(iface: { localVars: Variable[]; inputVars: Variable[]; outputVars: Variable[]; inOutVars: Variable[]; tempVars: Variable[]; globalVars: Variable[]; returnType?: string }): string {
  const sections: string[] = [];

  if (iface.returnType) {
    sections.push(`          <returnType><${iface.returnType}/></returnType>`);
  }

  if (iface.localVars.length > 0) {
    sections.push(`          <localVars>
${iface.localVars.map(v => generateVariable(v)).join('\n')}
          </localVars>`);
  }

  if (iface.inputVars.length > 0) {
    sections.push(`          <inputVars>
${iface.inputVars.map(v => generateVariable(v)).join('\n')}
          </inputVars>`);
  }

  if (iface.outputVars.length > 0) {
    sections.push(`          <outputVars>
${iface.outputVars.map(v => generateVariable(v)).join('\n')}
          </outputVars>`);
  }

  if (iface.inOutVars.length > 0) {
    sections.push(`          <inOutVars>
${iface.inOutVars.map(v => generateVariable(v)).join('\n')}
          </inOutVars>`);
  }

  return sections.length > 0 ? sections.join('\n') : '          <localVars/>';
}

function generateVariable(v: Variable): string {
  const attrs: string[] = [`name="${escapeXml(v.name)}"`];
  if (v.address) {
    attrs.push(`address="${escapeXml(v.address)}"`);
  }

  let typeXml = '';
  // Handle basic types
  const basicTypes = ['BOOL', 'INT', 'UINT', 'DINT', 'UDINT', 'REAL', 'LREAL', 'TIME', 'STRING', 'WORD', 'DWORD'];
  if (basicTypes.includes(v.type.toUpperCase())) {
    typeXml = `<${v.type.toUpperCase()}/>`;
  } else if (v.type.startsWith('STRING[')) {
    const len = v.type.match(/\[(\d+)\]/)?.[1] || '80';
    typeXml = `<string length="${len}"/>`;
  } else {
    // Custom type reference
    typeXml = `<derived name="${escapeXml(v.type)}"/>`;
  }

  let initXml = '';
  if (v.initialValue) {
    initXml = `\n              <initialValue><simpleValue value="${escapeXml(v.initialValue)}"/></initialValue>`;
  }

  let docXml = '';
  if (v.documentation) {
    docXml = `\n              <documentation><xhtml xmlns="http://www.w3.org/1999/xhtml">${escapeXml(v.documentation)}</xhtml></documentation>`;
  }

  return `            <variable ${attrs.join(' ')}>
              <type>${typeXml}</type>${initXml}${docXml}
            </variable>`;
}

// ============================================================================
// Body Generation (LD / ST)
// ============================================================================

function generateBody(body: { language: LanguageType; ld?: LadderDiagram; st?: StructuredText }): string {
  if (body.language === 'LD' && body.ld) {
    return generateLadderBody(body.ld);
  } else if (body.language === 'ST' && body.st) {
    return generateSTBody(body.st);
  }
  return '          <ST><xhtml xmlns="http://www.w3.org/1999/xhtml"/></ST>';
}

// ============================================================================
// Ladder Diagram Generation
// ============================================================================

function generateLadderBody(ld: LadderDiagram): string {
  return `          <LD>
${ld.rungs.map(rung => generateLDRung(rung)).join('\n')}
          </LD>`;
}

function generateLDRung(rung: LDRung): string {
  const elementsXml = rung.elements.map(el => generateLDElement(el)).join('\n');

  return `            <!-- ${rung.comment || `Rung ${rung.localId}`} -->
${elementsXml}`;
}

function generateLDElement(el: LDElement): string {
  const pos = `<position x="${el.position.x}" y="${el.position.y}"/>`;

  switch (el.type) {
    case 'leftPowerRail':
      return `            <leftPowerRail localId="${el.localId}">
              ${pos}
              <connectionPointOut/>
            </leftPowerRail>`;

    case 'rightPowerRail':
      return `            <rightPowerRail localId="${el.localId}">
              ${pos}
              <connectionPointIn>
                ${el.connectionPointIn?.connections.map(c => `<connection refLocalId="${c.refLocalId}"/>`).join('\n                ') || ''}
              </connectionPointIn>
            </rightPowerRail>`;

    case 'contact':
      return `            <contact localId="${el.localId}" negated="${el.negated || false}"${el.edge ? ` edge="${el.edge}"` : ''}>
              ${pos}
              <connectionPointIn>
                ${el.connectionPointIn?.connections.map(c => `<connection refLocalId="${c.refLocalId}"/>`).join('\n                ') || ''}
              </connectionPointIn>
              <connectionPointOut/>
              <variable>${escapeXml(el.variable || '')}</variable>
            </contact>`;

    case 'coil':
      return `            <coil localId="${el.localId}" negated="${el.negated || false}">
              ${pos}
              <connectionPointIn>
                ${el.connectionPointIn?.connections.map(c => `<connection refLocalId="${c.refLocalId}"/>`).join('\n                ') || ''}
              </connectionPointIn>
              <connectionPointOut/>
              <variable>${escapeXml(el.variable || '')}</variable>
            </coil>`;

    case 'block':
      return `            <block localId="${el.localId}" typeName="${escapeXml(el.expression || '')}">
              ${pos}
              <inputVariables>
                <variable formalParameter="IN">
                  <connectionPointIn>
                    ${el.connectionPointIn?.connections.map(c => `<connection refLocalId="${c.refLocalId}"/>`).join('\n                    ') || ''}
                  </connectionPointIn>
                </variable>
              </inputVariables>
              <outputVariables>
                <variable formalParameter="Q">
                  <connectionPointOut/>
                </variable>
              </outputVariables>
            </block>`;

    default:
      return `            <!-- Unknown element type: ${el.type} -->`;
  }
}

// ============================================================================
// Structured Text Generation
// ============================================================================

function generateSTBody(st: StructuredText): string {
  return `          <ST>
            <xhtml xmlns="http://www.w3.org/1999/xhtml">${escapeXml(st.code)}</xhtml>
          </ST>`;
}

// ============================================================================
// Configuration Generation
// ============================================================================

function generateConfiguration(config: Configuration): string {
  return `      <configuration name="${escapeXml(config.name)}">
${config.resources.map(res => generateResource(res)).join('\n')}
      </configuration>`;
}

function generateResource(res: Resource): string {
  const tasksXml = res.tasks.map(t => generateTask(t)).join('\n');
  const instancesXml = res.pouInstances.map(p => generatePOUInstance(p)).join('\n');

  return `        <resource name="${escapeXml(res.name)}">
${tasksXml}
${instancesXml}
        </resource>`;
}

function generateTask(task: Task): string {
  let attrs = `name="${escapeXml(task.name)}" priority="${task.priority}"`;
  if (task.interval) {
    attrs += ` interval="${escapeXml(task.interval)}"`;
  }
  if (task.single) {
    attrs += ` single="${escapeXml(task.single)}"`;
  }
  return `          <task ${attrs}/>`;
}

function generatePOUInstance(inst: POUInstance): string {
  return `          <pouInstance name="${escapeXml(inst.name)}" typeName="${escapeXml(inst.typeName)}"/>`;
}

// ============================================================================
// Helper Functions for Building POUs
// ============================================================================

/**
 * Create a simple LD program with basic start/stop logic
 */
export function createSimpleLDProgram(
  name: string,
  description: string,
  variables: Variable[],
  rungs: LDRung[]
): POU {
  return {
    name,
    pouType: 'program',
    documentation: description,
    interface: {
      localVars: variables,
      inputVars: [],
      outputVars: [],
      inOutVars: [],
      tempVars: [],
      globalVars: [],
    },
    body: {
      language: 'LD',
      ld: { rungs },
    },
  };
}

/**
 * Create a simple ST program
 */
export function createSimpleSTProgram(
  name: string,
  description: string,
  variables: Variable[],
  code: string
): POU {
  return {
    name,
    pouType: 'program',
    documentation: description,
    interface: {
      localVars: variables,
      inputVars: [],
      outputVars: [],
      inOutVars: [],
      tempVars: [],
      globalVars: [],
    },
    body: {
      language: 'ST',
      st: { code },
    },
  };
}

/**
 * Create a basic PLCopen project structure
 */
export function createBasicProject(
  projectName: string,
  pous: POU[]
): PLCopenProject {
  return {
    fileHeader: {
      companyName: 'PLCAutoPilot',
      productName: 'PLCAutoPilot Generator',
      productVersion: '1.0',
      creationDateTime: new Date().toISOString(),
      contentDescription: `Generated PLC program: ${projectName}`,
    },
    contentHeader: {
      name: projectName,
      version: '1.0',
      modificationDateTime: new Date().toISOString(),
      author: 'PLCAutoPilot AI',
      organization: 'PLCAutoPilot',
    },
    types: {
      dataTypes: [],
      pous,
    },
    instances: {
      configurations: [
        {
          name: 'Config',
          resources: [
            {
              name: 'Res',
              tasks: [
                {
                  name: 'MAST',
                  priority: 0,
                  interval: 'T#20ms',
                },
              ],
              pouInstances: pous
                .filter(p => p.pouType === 'program')
                .map(p => ({
                  name: p.name,
                  typeName: p.name,
                  taskName: 'MAST',
                })),
            },
          ],
        },
      ],
    },
  };
}

// ============================================================================
// LD Element Builders
// ============================================================================

let elementIdCounter = 0;

export function resetElementIdCounter(): void {
  elementIdCounter = 0;
}

export function nextElementId(): number {
  return ++elementIdCounter;
}

export function createLeftRail(x: number, y: number): LDElement {
  return {
    localId: nextElementId(),
    type: 'leftPowerRail',
    position: { x, y },
  };
}

export function createRightRail(x: number, y: number, connectedTo: number[]): LDElement {
  return {
    localId: nextElementId(),
    type: 'rightPowerRail',
    position: { x, y },
    connectionPointIn: {
      connections: connectedTo.map(id => ({ refLocalId: id })),
    },
  };
}

export function createContact(
  x: number,
  y: number,
  variable: string,
  connectedTo: number[],
  negated: boolean = false,
  edge?: 'rising' | 'falling'
): LDElement {
  return {
    localId: nextElementId(),
    type: 'contact',
    variable,
    negated,
    edge,
    position: { x, y },
    connectionPointIn: {
      connections: connectedTo.map(id => ({ refLocalId: id })),
    },
  };
}

export function createCoil(
  x: number,
  y: number,
  variable: string,
  connectedTo: number[],
  negated: boolean = false
): LDElement {
  return {
    localId: nextElementId(),
    type: 'coil',
    variable,
    negated,
    position: { x, y },
    connectionPointIn: {
      connections: connectedTo.map(id => ({ refLocalId: id })),
    },
  };
}

/**
 * Create a simple rung: --[contact]--[contact]--...---(coil)---
 */
export function createSimpleRung(
  rungId: number,
  comment: string,
  contacts: Array<{ variable: string; negated?: boolean }>,
  coilVariable: string,
  coilNegated: boolean = false
): LDRung {
  resetElementIdCounter();
  const elements: LDElement[] = [];

  // Left power rail
  const leftRail = createLeftRail(0, 0);
  elements.push(leftRail);

  // Contacts in series
  let prevId = leftRail.localId;
  let xPos = 100;

  for (const contact of contacts) {
    const contactEl = createContact(xPos, 0, contact.variable, [prevId], contact.negated || false);
    elements.push(contactEl);
    prevId = contactEl.localId;
    xPos += 100;
  }

  // Coil
  const coil = createCoil(xPos, 0, coilVariable, [prevId], coilNegated);
  elements.push(coil);

  // Right power rail
  const rightRail = createRightRail(xPos + 100, 0, [coil.localId]);
  elements.push(rightRail);

  return {
    localId: rungId,
    comment,
    elements,
    connections: [],
  };
}
