# Unified View Mode Styling Instructions

Replace the view mode section in AssetMaster.tsx (starting from line ~290) with this unified container approach:

## Main Column Structure (Left Side - lg:col-span-3)

```tsx
<div className="lg:col-span-3">
  {viewMode ? (
    // UNIFIED CONTAINER FOR VIEW MODE
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      
      {/* Basic Information */}
      <div className="pb-8 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Name</p>
            <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_name || 'N/A'}</p>
          </div>
          {/* ... other fields with same styling ... */}
        </div>
      </div>

      {/* Status & Maintenance */}
      <div className="py-8 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Status & Maintenance</h2>
        <div className="grid grid-cols-3 gap-6">
          {/* fields */}
        </div>
      </div>

      {/* Location Details */}
      <div className="py-8 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Location Details</h2>
        <div className="grid grid-cols-3 gap-6">
          {/* fields */}
        </div>
      </div>

      {/* SEZ & Customs */}
      <div className="py-8 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">SEZ & Customs</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* fields */}
        </div>
      </div>

      {/* Additional Information */}
      <div className="pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h2>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comments</p>
          <p className="text-sm font-medium text-gray-900 mt-2">{formData.comments || 'N/A'}</p>
        </div>
      </div>

    </div>
  ) : (
    // EDIT MODE - Keep existing separate cards with space-y-6
    <div className="space-y-6">
      {/* existing edit mode cards */}
    </div>
  )}
</div>
```

## Key Changes:
1. **One Container**: `bg-white rounded-xl border border-gray-200 shadow-sm p-8`
2. **Section Dividers**: `border-b border-gray-100` between sections
3. **Section Padding**: First section `pb-8`, middle sections `py-8`, last section `pt-8`
4. **Headers**: `text-lg font-semibold text-gray-900 mb-6` (no blue bar)
5. **Labels**: `text-xs font-medium text-gray-500 uppercase tracking-wide`
6. **Values**: `text-sm font-medium text-gray-900 mt-2`
7. **Grid Gaps**: `gap-6` instead of `gap-4`

## Sidebar (Right Side)
Keep existing cards but make Asset Picture read-only in view mode (remove dashed border upload UI).
