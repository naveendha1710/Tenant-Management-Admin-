const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Verify user session from localStorage token
async function verifyAuth(req, res, next) {
  try {
    // Accept auth from headers or query params
    const userId = req.headers['x-user-id'] || req.query.uid;
    const userEmail = req.headers['x-user-email'] || req.query.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Unauthorized - Missing credentials' });
    }

    // Verify user exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', userId)
      .eq('email', decodeURIComponent(userEmail))
      .maybeSingle();

    if (error || !user) {
      // Check tenants table
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, email, status')
        .eq('id', userId)
        .eq('email', decodeURIComponent(userEmail))
        .maybeSingle();

      if (tenantError || !tenant) {
        return res.status(401).json({ error: 'Unauthorized - Invalid user' });
      }

      if (tenant.status !== 'Active') {
        return res.status(403).json({ error: 'Forbidden - Account inactive' });
      }

      req.user = { id: tenant.id, email: tenant.email, role: 'Tenant' };
      return next();
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Forbidden - Account inactive' });
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { verifyAuth };
