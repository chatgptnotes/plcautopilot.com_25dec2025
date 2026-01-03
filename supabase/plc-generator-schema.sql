-- PLCAutoPilot Generator Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- PLC Prompts Table
-- ============================================
CREATE TABLE IF NOT EXISTS plc_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_plc_prompts_is_default ON plc_prompts(is_default);

-- ============================================
-- PLC Generated Files Table
-- ============================================
CREATE TABLE IF NOT EXISTS plc_generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  filename VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  extension VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  context_used TEXT,
  ai_generated BOOLEAN DEFAULT true,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_plc_generated_files_created_at ON plc_generated_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plc_generated_files_manufacturer ON plc_generated_files(manufacturer);
CREATE INDEX IF NOT EXISTS idx_plc_generated_files_user_id ON plc_generated_files(user_id);
CREATE INDEX IF NOT EXISTS idx_plc_generated_files_user_email ON plc_generated_files(user_email);

-- ============================================
-- PLC Generator Config Table
-- ============================================
CREATE TABLE IF NOT EXISTS plc_generator_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(255) UNIQUE NOT NULL DEFAULT 'default',
  selected_manufacturer_id VARCHAR(255),
  selected_series_id VARCHAR(255),
  selected_model_id VARCHAR(255),
  selected_template VARCHAR(255),
  selected_skills TEXT[] DEFAULT '{}',
  selected_prompt_id UUID REFERENCES plc_prompts(id) ON DELETE SET NULL,
  combined_context TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_plc_generator_config_key ON plc_generator_config(config_key);

-- ============================================
-- Enable Row Level Security (Public access for now)
-- ============================================
ALTER TABLE plc_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plc_generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE plc_generator_config ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (no auth required)
-- You can modify these policies later to require authentication

CREATE POLICY "Allow public read on plc_prompts" ON plc_prompts
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on plc_prompts" ON plc_prompts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on plc_prompts" ON plc_prompts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on plc_prompts" ON plc_prompts
  FOR DELETE USING (is_default = false); -- Prevent deleting default prompts

CREATE POLICY "Allow public read on plc_generated_files" ON plc_generated_files
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on plc_generated_files" ON plc_generated_files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on plc_generator_config" ON plc_generator_config
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on plc_generator_config" ON plc_generator_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on plc_generator_config" ON plc_generator_config
  FOR UPDATE USING (true);

-- ============================================
-- Insert Default Prompts
-- ============================================
INSERT INTO plc_prompts (name, content, is_default) VALUES
(
  'Basic Motor Control',
  'Create a motor start/stop program with:
- START button (%I0.1) to turn motor ON
- STOP button (%I0.2, NC) to turn motor OFF
- Motor output at %Q0.0 with seal-in circuit
- Include proper ladder and IL representation',
  true
),
(
  'Tank Level with Analog',
  'Create a tank level control program with:
- 4-20mA level sensor on %IW0.0
- High level alarm at 80%
- Low level alarm at 20%
- Pump control output
- HMI display values in %MF registers',
  true
),
(
  'Sequential Timer Control',
  'Create a sequential control program with:
- START button to begin sequence
- 3-second timer between each step
- 4 sequential outputs
- STOP button to reset sequence
- Use %TM0, %TM1, %TM2 timers',
  true
),
(
  'Custom Prompt',
  'Describe your PLC logic requirements here...',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Insert Default Config
-- ============================================
INSERT INTO plc_generator_config (config_key, selected_skills, combined_context)
VALUES ('default', '{}', '')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- Helper Function: Update timestamp on update
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for plc_prompts
DROP TRIGGER IF EXISTS update_plc_prompts_updated_at ON plc_prompts;
CREATE TRIGGER update_plc_prompts_updated_at
    BEFORE UPDATE ON plc_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plc_generator_config
DROP TRIGGER IF EXISTS update_plc_generator_config_updated_at ON plc_generator_config;
CREATE TRIGGER update_plc_generator_config_updated_at
    BEFORE UPDATE ON plc_generator_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Verify tables were created
-- ============================================
SELECT 'plc_prompts' as table_name, count(*) as row_count FROM plc_prompts
UNION ALL
SELECT 'plc_generated_files', count(*) FROM plc_generated_files
UNION ALL
SELECT 'plc_generator_config', count(*) FROM plc_generator_config;
