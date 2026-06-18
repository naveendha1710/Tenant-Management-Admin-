-- Check sample resolution_notes from maintenance_tickets to debug materials parsing
SELECT 
  id,
  substring(resolution_notes from 1 for 1000) as notes_sample
FROM maintenance_tickets 
WHERE resolution_notes LIKE '%Materials:%'
LIMIT 2;
