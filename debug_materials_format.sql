-- Check sample resolution_notes to debug materials parsing
SELECT 
  id,
  ticket_id,
  materials,
  substring(resolution_notes from 1 for 800) as notes_sample
FROM ticket_estimations 
WHERE resolution_notes LIKE '%Materials:%'
LIMIT 3;
