-- =====================================================
-- FIX: Notifications Table & Ticket Display Issues
-- =====================================================

-- 1. Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}'::jsonb,
  ticket_id UUID,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_event_name ON notifications(event_name);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- 3. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role full access" ON notifications;

-- 5. Create RLS Policies (simplified - no user_roles dependency)
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;
GRANT ALL ON notifications TO anon;

-- 7. Add foreign key constraint to maintenance_tickets if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_tickets') THEN
    ALTER TABLE notifications 
    DROP CONSTRAINT IF EXISTS fk_notifications_ticket;
    
    ALTER TABLE notifications 
    ADD CONSTRAINT fk_notifications_ticket 
    FOREIGN KEY (ticket_id) 
    REFERENCES maintenance_tickets(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 8. Create function to send notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_event_name TEXT,
  p_title TEXT,
  p_message TEXT,
  p_priority TEXT DEFAULT 'medium',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ticket_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    event_name,
    title,
    message,
    priority,
    metadata,
    ticket_id
  ) VALUES (
    p_user_id,
    p_event_name,
    p_title,
    p_message,
    p_priority,
    p_metadata,
    p_ticket_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 9. Grant execute permission on function
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO service_role;

-- 10. Verify table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE NOTICE 'SUCCESS: notifications table created and configured';
  ELSE
    RAISE EXCEPTION 'FAILED: notifications table was not created';
  END IF;
END $$;
