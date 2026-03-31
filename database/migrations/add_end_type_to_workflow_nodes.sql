-- Add end_type column to workflow_nodes table to distinguish between approved and rejected END nodes
ALTER TABLE workflow_nodes
ADD COLUMN IF NOT EXISTS end_type TEXT CHECK (end_type IN ('approved', 'rejected'));

-- Add comment
COMMENT ON COLUMN workflow_nodes.end_type IS 'Type of END node: approved or rejected';
