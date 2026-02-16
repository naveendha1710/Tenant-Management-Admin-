import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Database, Loader2 } from 'lucide-react';
import { createCRMTables } from '@/services/databaseSetup';

export function DatabaseTest() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test Supabase connection
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      testResults.connection = { success: !error, error: error?.message };
    } catch (error) {
      testResults.connection = { success: false, error: 'Connection failed' };
    }

    // Test leads table
    try {
      const { data, error } = await supabase.from('leads').select('count').limit(1);
      testResults.leads = { 
        success: !error, 
        error: error?.message,
        exists: !error
      };
    } catch (error) {
      testResults.leads = { success: false, error: 'Table not found', exists: false };
    }

    // Test communications table
    try {
      const { data, error } = await supabase.from('communications').select('count').limit(1);
      testResults.communications = { 
        success: !error, 
        error: error?.message,
        exists: !error
      };
    } catch (error) {
      testResults.communications = { success: false, error: 'Table not found', exists: false };
    }

    // Test tenant_applications table
    try {
      const { data, error } = await supabase.from('tenant_applications').select('count').limit(1);
      testResults.tenant_applications = { 
        success: !error, 
        error: error?.message,
        exists: !error
      };
    } catch (error) {
      testResults.tenant_applications = { success: false, error: 'Table not found', exists: false };
    }

    // Test tenants table
    try {
      const { data, error } = await supabase.from('tenants').select('count').limit(1);
      testResults.tenants = { 
        success: !error, 
        error: error?.message,
        exists: !error
      };
    } catch (error) {
      testResults.tenants = { success: false, error: 'Table not found', exists: false };
    }

    // Get actual data counts
    if (testResults.leads?.success) {
      try {
        const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
        testResults.leads.count = count;
      } catch (error) {
        testResults.leads.count = 0;
      }
    }

    if (testResults.communications?.success) {
      try {
        const { count } = await supabase.from('communications').select('*', { count: 'exact', head: true });
        testResults.communications.count = count;
      } catch (error) {
        testResults.communications.count = 0;
      }
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    testConnection();
  }, []);

  const createTables = async () => {
    setLoading(true);
    try {
      const result = await createCRMTables();
      if (result.success) {
        alert('✅ Please check the console for SQL commands to run in Supabase Dashboard');
      } else {
        alert('❌ Failed. Check console for details.');
      }
    } catch (error) {
      console.error('Error creating tables:', error);
      alert('❌ Error creating tables. Check console for details.');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={testConnection} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Connection
          </Button>
          <Button onClick={createTables} variant="outline" disabled={loading}>
            ⚙️ Create CRM Tables
          </Button>
        </div>

        <div className="space-y-3">
          {Object.entries(results).map(([key, result]: [string, any]) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                {result.count !== undefined && (
                  <Badge variant="outline">{result.count} records</Badge>
                )}
              </div>
              <div className="text-right">
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'Connected' : 'Failed'}
                </Badge>
                {result.error && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(results).length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded">
            <h4 className="font-medium mb-2">Summary:</h4>
            <ul className="text-sm space-y-1">
              <li>• Supabase connection: {results.connection?.success ? '✅' : '❌'}</li>
              <li>• CRM tables exist: {results.leads?.exists && results.communications?.exists ? '✅' : '❌'}</li>
              <li>• Tenant system ready: {results.tenants?.exists && results.tenant_applications?.exists ? '✅' : '❌'}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}