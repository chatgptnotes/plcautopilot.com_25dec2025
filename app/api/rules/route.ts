/**
 * Rules API - Store and retrieve expert rules for PLC generation
 * Rules are shared across all users
 * Falls back to local storage if Supabase is not configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Only create Supabase client if env vars are available
let supabase: SupabaseClient | null = null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// In-memory fallback when Supabase is not available
let localRulesCache: { id: string; content: string; updated_at: string } | null = null;

// GET - Retrieve rules
export async function GET() {
  try {
    // If Supabase is available, use it
    if (supabase) {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('id', 'expert-rules')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rules:', error);
        // Fall back to local cache on error
        return NextResponse.json({ rules: localRulesCache });
      }

      return NextResponse.json({ rules: data || null });
    }

    // Fallback: return local cache
    return NextResponse.json({ rules: localRulesCache });
  } catch (err) {
    console.error('Rules GET error:', err);
    return NextResponse.json({ rules: localRulesCache });
  }
}

// POST - Create rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
    }

    const rulesData = {
      id,
      content,
      updated_at: new Date().toISOString(),
    };

    // If Supabase is available, use it
    if (supabase) {
      const { data, error } = await supabase
        .from('rules')
        .insert(rulesData)
        .select()
        .single();

      if (error) {
        console.error('Error creating rules:', error);
        // Fall back to local cache
        localRulesCache = rulesData;
        return NextResponse.json({ rules: rulesData });
      }

      return NextResponse.json({ rules: data });
    }

    // Fallback: store in local cache
    localRulesCache = rulesData;
    return NextResponse.json({ rules: rulesData });
  } catch (err) {
    console.error('Rules POST error:', err);
    return NextResponse.json({ error: 'Failed to create rules' }, { status: 500 });
  }
}

// PUT - Update rules
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
    }

    const rulesData = {
      id,
      content,
      updated_at: new Date().toISOString(),
    };

    // If Supabase is available, use it
    if (supabase) {
      const { data, error } = await supabase
        .from('rules')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rules:', error);
        // Fall back to local cache
        localRulesCache = rulesData;
        return NextResponse.json({ rules: rulesData });
      }

      return NextResponse.json({ rules: data });
    }

    // Fallback: store in local cache
    localRulesCache = rulesData;
    return NextResponse.json({ rules: rulesData });
  } catch (err) {
    console.error('Rules PUT error:', err);
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 });
  }
}
