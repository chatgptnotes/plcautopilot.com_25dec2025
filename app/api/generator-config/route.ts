import { NextRequest, NextResponse } from 'next/server';
import { getGeneratorConfig, saveGeneratorConfig, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configKey = searchParams.get('key') || 'default';

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        config: null,
        source: 'local',
        message: 'Supabase not configured',
      });
    }

    const config = await getGeneratorConfig(configKey);
    return NextResponse.json({
      config,
      source: 'supabase',
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({
      config: null,
      source: 'local',
      error: 'Failed to fetch config',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured', saved: false },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      config_key = 'default',
      selected_manufacturer_id,
      selected_series_id,
      selected_model_id,
      selected_template,
      selected_skills,
      selected_prompt_id,
      combined_context,
    } = body;

    const config = await saveGeneratorConfig({
      config_key,
      selected_manufacturer_id,
      selected_series_id,
      selected_model_id,
      selected_template,
      selected_skills: selected_skills || [],
      selected_prompt_id,
      combined_context: combined_context || '',
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Failed to save config', saved: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ config, saved: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save config', saved: false },
      { status: 500 }
    );
  }
}
