import { NextRequest, NextResponse } from 'next/server';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, isSupabaseConfigured } from '@/lib/supabase';

// Default prompts (fallback when Supabase is not configured)
// IDs MUST match STANDARD_LOGIC_TEMPLATES in app/generator/page.tsx
const DEFAULT_PROMPTS = [
  { id: 'motor-control', name: 'Motor Start/Stop Control', content: `Create a motor start/stop control program with:
- START pushbutton (NO contact)
- STOP pushbutton (NC contact for safety)
- ESTOP emergency stop (NC contact)
- Overload protection input
- Motor running output with seal-in latch
- Running indicator light
- Fault indicator light

Include safety interlocks and proper shutdown sequence.`, is_default: true },
  { id: 'tank-level', name: 'Tank Level Control', content: `Create a tank level control program with:
- 4-20mA level sensor input
- High level alarm threshold
- Low level alarm threshold
- Inlet valve control (fill when low)
- Outlet valve control (drain when high)
- HMI display values for tank level percentage and liters

Scale 4-20mA (2000-10000 raw) to 0-1000 liters.
Include hysteresis to prevent valve chattering.`, is_default: true },
  { id: 'sequential-lights', name: 'Sequential Traffic Lights', content: `Create a sequential traffic light control program with:
- Green light ON for 30 seconds
- Yellow light ON for 5 seconds
- Red light ON for 30 seconds
- Continuous cycle when enabled
- Manual override for each light
- Emergency all-red mode

Use timers for timing and memory bits for state tracking.`, is_default: true },
  { id: 'pump-control', name: 'Pump Pressure Control', content: `Create a pump pressure control program with:
- 4-20mA pressure sensor input
- Low pressure setpoint (turn pump ON)
- High pressure setpoint (turn pump OFF)
- Pump running output
- Low pressure alarm
- High pressure alarm
- HMI display for pressure in PSI

Include hysteresis and dry-run protection.`, is_default: true },
];

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        prompts: DEFAULT_PROMPTS,
        source: 'local',
      });
    }

    const prompts = await getPrompts();
    return NextResponse.json({
      prompts: prompts.length > 0 ? prompts : DEFAULT_PROMPTS,
      source: prompts.length > 0 ? 'supabase' : 'local',
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({
      prompts: DEFAULT_PROMPTS,
      source: 'local',
      error: 'Failed to fetch from database',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, content, is_default = false } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    const prompt = await createPrompt({ name, content, is_default });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Failed to create prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, name, content } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;

    const prompt = await updatePrompt(id, updates);

    if (!prompt) {
      return NextResponse.json(
        { error: 'Failed to update prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    const success = await deletePrompt(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete prompt or prompt is default' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
