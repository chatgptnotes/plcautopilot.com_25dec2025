import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables (may be undefined)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured - must check BEFORE creating client
export function isSupabaseConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.length > 0 &&
    supabaseAnonKey.length > 0 &&
    supabaseUrl !== 'your-project-url.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key'
  );
}

// Lazy client initialization - only create if configured
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  }
  return _supabase;
}

// Export for backward compatibility (but may be null)
// Wrapped in try-catch to prevent module load crashes on Vercel
let _exportedSupabase: SupabaseClient | null = null;
try {
  if (isSupabaseConfigured()) {
    _exportedSupabase = createClient(supabaseUrl!, supabaseAnonKey!);
  }
} catch (e) {
  console.warn('Supabase client creation failed (this is OK if Supabase is not configured):', e);
  _exportedSupabase = null;
}
export const supabase = _exportedSupabase;

// Database types
export interface PLCPrompt {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PLCGeneratedFile {
  id: string;
  filename: string;
  content: string;
  extension: string;
  manufacturer: string;
  model: string;
  context_used: string;
  ai_generated: boolean;
  tokens_used: number;
  created_at: string;
}

export interface PLCGeneratorConfig {
  id: string;
  config_key: string;
  selected_manufacturer_id: string | null;
  selected_series_id: string | null;
  selected_model_id: string | null;
  selected_template: string | null;
  selected_skills: string[];
  selected_prompt_id: string | null;
  combined_context: string;
  updated_at: string;
}

// Prompts API
export async function getPrompts(): Promise<PLCPrompt[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('plc_prompts')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }
  return data || [];
}

export async function createPrompt(prompt: Omit<PLCPrompt, 'id' | 'created_at' | 'updated_at'>): Promise<PLCPrompt | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('plc_prompts')
    .insert([prompt])
    .select()
    .single();

  if (error) {
    console.error('Error creating prompt:', error);
    return null;
  }
  return data;
}

export async function updatePrompt(id: string, updates: Partial<PLCPrompt>): Promise<PLCPrompt | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('plc_prompts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating prompt:', error);
    return null;
  }
  return data;
}

export async function deletePrompt(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { error } = await client
    .from('plc_prompts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting prompt:', error);
    return false;
  }
  return true;
}

// Generated Files API
export async function saveGeneratedFile(file: Omit<PLCGeneratedFile, 'id' | 'created_at'>): Promise<PLCGeneratedFile | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('plc_generated_files')
    .insert([file])
    .select()
    .single();

  if (error) {
    console.error('Error saving generated file:', error);
    return null;
  }
  return data;
}

export async function getGeneratedFiles(limit: number = 50): Promise<PLCGeneratedFile[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('plc_generated_files')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching generated files:', error);
    return [];
  }
  return data || [];
}

export async function getGeneratedFile(id: string): Promise<PLCGeneratedFile | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('plc_generated_files')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching generated file:', error);
    return null;
  }
  return data;
}

// Config API
export async function getGeneratorConfig(configKey: string = 'default'): Promise<PLCGeneratorConfig | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('plc_generator_config')
    .select('*')
    .eq('config_key', configKey)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching config:', error);
    return null;
  }
  return data;
}

export async function saveGeneratorConfig(config: Omit<PLCGeneratorConfig, 'id' | 'updated_at'>): Promise<PLCGeneratorConfig | null> {
  const client = getSupabase();
  if (!client) return null;

  // Upsert based on config_key
  const { data, error } = await client
    .from('plc_generator_config')
    .upsert([{ ...config, updated_at: new Date().toISOString() }], {
      onConflict: 'config_key',
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving config:', error);
    return null;
  }
  return data;
}
