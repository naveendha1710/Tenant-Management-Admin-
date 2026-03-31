-- Global email kill-switch
CREATE TABLE IF NOT EXISTS email_global_settings (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled    BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single row — system-wide toggle
INSERT INTO email_global_settings (enabled) VALUES (true);
