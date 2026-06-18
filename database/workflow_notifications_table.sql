-- Create workflow_notifications table
CREATE TABLE IF NOT EXISTS public.workflow_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT workflow_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk_workflow_notifications_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient ON public.workflow_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_sent_at ON public.workflow_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_read_at ON public.workflow_notifications(read_at);

-- Add RLS policies
ALTER TABLE public.workflow_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.workflow_notifications
  FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Policy: System can insert notifications
CREATE POLICY "System can insert notifications" ON public.workflow_notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.workflow_notifications
  FOR UPDATE
  USING (recipient_user_id = auth.uid());

-- Add comment
COMMENT ON TABLE public.workflow_notifications IS 'Stores workflow-related notifications sent to users';
