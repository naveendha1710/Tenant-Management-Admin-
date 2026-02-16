-- Add Assets permission to all Super Admin users
UPDATE users
SET permissions = permissions || '[{"module":"Assets","view":true,"add":true,"edit":true,"delete":true}]'::jsonb
WHERE role = 'Super Admin'
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(permissions) AS p
  WHERE p->>'module' = 'Assets'
);

-- Add Assets permission to all Admin users
UPDATE users
SET permissions = permissions || '[{"module":"Assets","view":true,"add":true,"edit":true,"delete":true}]'::jsonb
WHERE role = 'Admin'
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(permissions) AS p
  WHERE p->>'module' = 'Assets'
);
