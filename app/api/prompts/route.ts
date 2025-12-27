import { NextRequest, NextResponse } from 'next/server';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, isSupabaseConfigured } from '@/lib/supabase';

// Default prompts (fallback when Supabase is not configured)
const DEFAULT_PROMPTS = [
  { id: '1', name: 'Basic Motor Control', content: 'Create a motor start/stop program with:\n- START button (%I0.1) to turn motor ON\n- STOP button (%I0.2, NC) to turn motor OFF\n- Motor output at %Q0.0 with seal-in circuit\n- Include proper ladder and IL representation', is_default: true },
  { id: '2', name: 'Tank Level with Analog', content: 'Create a tank level control program with:\n- 4-20mA level sensor on %IW0.0\n- High level alarm at 80%\n- Low level alarm at 20%\n- Pump control output\n- HMI display values in %MF registers', is_default: true },
  { id: '3', name: 'Sequential Timer Control', content: 'Create a sequential control program with:\n- START button to begin sequence\n- 3-second timer between each step\n- 4 sequential outputs\n- STOP button to reset sequence\n- Use %TM0, %TM1, %TM2 timers', is_default: true },
  { id: '4', name: 'Custom Prompt', content: 'Describe your PLC logic requirements here...', is_default: true },
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
