import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useMetadataMaps() {
  const [bMap, setBMap] = useState<Record<string, string>>({});
  const [tMap, setTMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const [{ data: bData }, { data: tData }] = await Promise.all([
        supabase.from('buildings').select('id, name'),
        supabase.from('tenants').select('id, company, name')
      ]);

      const newBMap: Record<string, string> = {};
      bData?.forEach(b => newBMap[b.id] = b.name);
      
      const newTMap: Record<string, string> = {};
      tData?.forEach(t => newTMap[t.id] = t.company || t.name);
      
      setBMap(newBMap);
      setTMap(newTMap);
    }
    load();
  }, []);

  return { buildingMap: bMap, tenantMap: tMap };
}
