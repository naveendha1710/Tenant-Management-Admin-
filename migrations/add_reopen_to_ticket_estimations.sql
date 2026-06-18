-- Add reopened tracking columns
ALTER TABLE public.ticket_estimations 
ADD COLUMN IF NOT EXISTS reopened_by uuid NULL,
ADD COLUMN IF NOT EXISTS reopened_at timestamp with time zone NULL;

-- Add foreign key for reopened_by
ALTER TABLE public.ticket_estimations
ADD CONSTRAINT fk_ticket_estimations_reopened_by 
FOREIGN KEY (reopened_by) REFERENCES users(id);

-- Update status constraint to include 'reopened'
ALTER TABLE public.ticket_estimations 
DROP CONSTRAINT IF EXISTS ticket_estimations_status_check;

ALTER TABLE public.ticket_estimations
ADD CONSTRAINT ticket_estimations_status_check CHECK (
  (status)::text = ANY (
    ARRAY[
      'submitted'::character varying,
      'manager_rejected'::character varying,
      'tenant_rejected'::character varying,
      'approved'::character varying,
      'change_requested'::character varying,
      'reopened'::character varying
    ]::text[]
  )
);
