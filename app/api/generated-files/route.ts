import { NextRequest, NextResponse } from 'next/server';
import { getGeneratedFiles, saveGeneratedFile, getGeneratedFile, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        files: [],
        source: 'local',
        message: 'Supabase not configured',
      });
    }

    if (id) {
      const file = await getGeneratedFile(id);
      return NextResponse.json({
        file,
        source: 'supabase',
      });
    }

    const files = await getGeneratedFiles(limit);
    return NextResponse.json({
      files,
      source: 'supabase',
    });
  } catch (error) {
    console.error('Error fetching generated files:', error);
    return NextResponse.json({
      files: [],
      source: 'local',
      error: 'Failed to fetch files',
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
      filename,
      content,
      extension,
      manufacturer,
      model,
      context_used,
      ai_generated = true,
      tokens_used = 0,
    } = body;

    if (!filename || !content) {
      return NextResponse.json(
        { error: 'Filename and content are required' },
        { status: 400 }
      );
    }

    const file = await saveGeneratedFile({
      filename,
      content,
      extension: extension || '.xml',
      manufacturer: manufacturer || '',
      model: model || '',
      context_used: context_used || '',
      ai_generated,
      tokens_used,
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Failed to save file', saved: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ file, saved: true });
  } catch (error) {
    console.error('Error saving generated file:', error);
    return NextResponse.json(
      { error: 'Failed to save file', saved: false },
      { status: 500 }
    );
  }
}
