-- Enable only Maintenance tab for all Tenant users
UPDATE public.users
SET permissions = '[
  {
    "add": false,
    "edit": false,
    "view": false,
    "delete": false,
    "module": "Profile"
  },
  {
    "add": false,
    "edit": false,
    "view": false,
    "delete": false,
    "module": "Dashboard"
  },
  {
    "add": false,
    "edit": false,
    "view": false,
    "delete": false,
    "module": "My Lease"
  },
  {
    "add": false,
    "edit": false,
    "view": false,
    "delete": false,
    "module": "Invoices"
  },
  {
    "add": false,
    "edit": false,
    "view": false,
    "delete": false,
    "module": "Documents"
  },
  {
    "add": false,
    "edit": false,
    "view": true,
    "delete": false,
    "module": "Maintenance"
  },
  {
    "add": false,
    "edit": false,
    "view": false,
    "delete": false,
    "module": "My Assets"
  }
]'::jsonb
WHERE role = 'Tenant';
