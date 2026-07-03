import { useEffect, useMemo, useState } from 'react';
import {
  getTenantFieldsByCategory,
  loadTenantDynamicChargeFields,
  type TenantDynamicChargeFieldDefinition,
} from '@/utils/reports/tenantReportFields';

export function useTenantReportFieldDefinitions(enabled = true) {
  const [dynamicFields, setDynamicFields] = useState<TenantDynamicChargeFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDynamicFields([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadFields = async () => {
      setLoading(true);
      try {
        const fields = await loadTenantDynamicChargeFields();
        if (isActive) {
          setDynamicFields(fields);
        }
      } catch {
        if (isActive) {
          setDynamicFields([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadFields();

    return () => {
      isActive = false;
    };
  }, [enabled]);

  const fieldsByCategory = useMemo(
    () => getTenantFieldsByCategory(dynamicFields),
    [dynamicFields]
  );

  return {
    dynamicFields,
    fieldsByCategory,
    loading,
  };
}
