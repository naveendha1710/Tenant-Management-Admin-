-- Sample data for dropdown_configs table
INSERT INTO public.dropdown_configs (entity_type, field_name, config_data)
VALUES (
  'asset',
  'categories',
  '[
    {
      "id": "1",
      "name": "IT Equipment",
      "code": "ITE",
      "subTypes": [
        {"id": 1, "name": "Laptop", "code": "LPT"},
        {"id": 2, "name": "Desktop", "code": "DSK"},
        {"id": 3, "name": "Monitor", "code": "MON"},
        {"id": 4, "name": "Printer", "code": "PRT"},
        {"id": 5, "name": "Server", "code": "SRV"}
      ],
      "manufacturers": ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer"]
    },
    {
      "id": "2",
      "name": "Furniture",
      "code": "FUR",
      "subTypes": [
        {"id": 6, "name": "Chair", "code": "CHR"},
        {"id": 7, "name": "Desk", "code": "DSK"},
        {"id": 8, "name": "Cabinet", "code": "CAB"},
        {"id": 9, "name": "Table", "code": "TBL"}
      ],
      "manufacturers": ["IKEA", "Steelcase", "Herman Miller", "Godrej"]
    },
    {
      "id": "3",
      "name": "Machinery",
      "code": "MCH",
      "subTypes": [
        {"id": 10, "name": "CNC Machine", "code": "CNC"},
        {"id": 11, "name": "Lathe", "code": "LTH"},
        {"id": 12, "name": "Drill Press", "code": "DRL"}
      ],
      "manufacturers": ["Haas", "DMG Mori", "Mazak", "Okuma"]
    },
    {
      "id": "4",
      "name": "Vehicles",
      "code": "VEH",
      "subTypes": [
        {"id": 13, "name": "Car", "code": "CAR"},
        {"id": 14, "name": "Van", "code": "VAN"},
        {"id": 15, "name": "Truck", "code": "TRK"}
      ],
      "manufacturers": ["Toyota", "Mahindra", "Tata", "Maruti"]
    },
    {
      "id": "5",
      "name": "Office Equipment",
      "code": "OFC",
      "subTypes": [
        {"id": 16, "name": "Projector", "code": "PRJ"},
        {"id": 17, "name": "Scanner", "code": "SCN"},
        {"id": 18, "name": "Photocopier", "code": "PHC"}
      ],
      "manufacturers": ["Canon", "Epson", "Xerox", "Brother"]
    }
  ]'::jsonb
)
ON CONFLICT (entity_type, field_name) 
DO UPDATE SET config_data = EXCLUDED.config_data;
