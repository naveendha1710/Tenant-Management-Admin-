-- Create workflow_notifications table
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_instance_steps(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipient_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient ON workflow_notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_instance ON workflow_notifications(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_step ON workflow_notifications(step_id);

-- Grant permissions (for custom auth without Supabase auth)
GRANT ALL ON workflow_notifications TO public;

-- Enable RLS
ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for public (since using custom auth)
CREATE POLICY "Allow all operations on workflow_notifications" 
ON workflow_notifications 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
