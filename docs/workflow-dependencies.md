# Workflow Engine - Required Dependencies

## Add to package.json

```json
{
  "dependencies": {
    "reactflow": "^11.10.4",
    "sonner": "^1.3.1"
  }
}
```

## Installation Command

```bash
npm install reactflow sonner
```

## Dependency Details

### reactflow (^11.10.4)
- **Purpose**: Visual workflow builder with drag-and-drop
- **Features**: 
  - Node-based graph editor
  - Custom node types
  - Edge connections
  - Pan/zoom controls
  - Background grid
- **Size**: ~500KB
- **License**: MIT

### sonner (^1.3.1)
- **Purpose**: Toast notifications for user feedback
- **Features**:
  - Beautiful toast messages
  - Promise-based API
  - Customizable styling
  - Auto-dismiss
- **Size**: ~10KB
- **License**: MIT

## Already Available Dependencies

The following dependencies are already in the project and used by the workflow engine:

- `@supabase/supabase-js` - Database client
- `react` - UI framework
- `react-router-dom` - Routing
- `lucide-react` - Icons
- `tailwindcss` - Styling
- `@radix-ui/*` - UI components (Dialog, Select, etc.)

## TypeScript Configuration

No changes needed. Existing `tsconfig.json` is compatible.

## Vite Configuration

No changes needed. Existing `vite.config.ts` is compatible.

## Post-Installation Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Verify installation:
   ```bash
   npm list reactflow sonner
   ```

3. Import in components:
   ```typescript
   import ReactFlow from 'reactflow';
   import 'reactflow/dist/style.css';
   import { toast } from 'sonner';
   ```

4. Add Toaster to App.tsx:
   ```typescript
   import { Toaster } from 'sonner';
   
   function App() {
     return (
       <>
         <Toaster position="top-right" />
         {/* ... rest of app */}
       </>
     );
   }
   ```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Bundle Size Impact

- reactflow: ~500KB (gzipped: ~150KB)
- sonner: ~10KB (gzipped: ~3KB)
- Total addition: ~510KB (~153KB gzipped)

## Performance Notes

- React Flow uses virtualization for large graphs
- Lazy loading recommended for workflow builder
- Consider code splitting for production

## Alternative Libraries (Not Used)

We chose React Flow over:
- **react-diagrams**: More complex, larger bundle
- **rete.js**: Less React-friendly
- **jointjs**: Commercial license required
- **gojs**: Commercial license required

We chose Sonner over:
- **react-toastify**: Larger bundle, less modern
- **react-hot-toast**: Similar but less features
- **notistack**: Material-UI dependency
