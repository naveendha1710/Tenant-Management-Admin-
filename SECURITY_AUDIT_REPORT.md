# Security Audit Report: Rathinam Nexus Suite

**Audit Date:** 2025-02-25  
**Auditor Role:** Senior Application Security Architect & Penetration Tester  
**System Version:** 1.5.4  
**Scope:** Full-stack enterprise tenant management platform

---

## 1. Executive Summary

### Overall Security Posture: **MODERATE RISK**

The Rathinam Nexus Suite demonstrates a functional enterprise application with recent improvements to password security (bcrypt implementation). However, critical vulnerabilities remain across authentication, session management, API security, and infrastructure layers that expose the system to unauthorized access, data breaches, and service disruption.

**Key Findings:**
- ✅ **Improved:** Bcrypt password hashing implemented for system users
- ❌ **Critical:** localStorage-based session management without encryption or expiration
- ❌ **Critical:** No API rate limiting or request throttling
- ❌ **Critical:** Tenant passwords remain in plain text
- ❌ **High:** Missing CSRF protection on state-changing operations
- ❌ **High:** Unrestricted file upload with insufficient validation
- ❌ **High:** Supabase anonymous key exposed in frontend code
- ⚠️ **Medium:** No input validation middleware on backend routes
- ⚠️ **Medium:** CORS configured to allow all origins

**Business Impact:**
- **Data Breach Risk:** High - Compromised sessions could expose tenant financial data, lease agreements, and PII
- **Service Disruption:** High - Lack of rate limiting enables DoS attacks
- **Compliance Risk:** High - Plain text tenant passwords violate GDPR, SOC 2, and industry standards
- **Reputation Damage:** Critical - Security incident would severely impact trust in property management platform

---

## 2. Critical Vulnerabilities (Immediate Action Required)

### 2.1 Insecure Session Management (CVSS 9.1 - CRITICAL)

**Vulnerability:** Sessions stored in localStorage without encryption, expiration, or secure flags.

**Location:** `src/contexts/AuthContext.tsx`

**Attack Vector:**
```javascript
// Current implementation
localStorage.setItem('demo_user', JSON.stringify(user));
localStorage.setItem('demo_role', appUser.role);
```

**Exploitation:**
1. XSS attack injects script to read `localStorage.getItem('demo_user')`
2. Attacker gains full user session with permissions
3. Session persists indefinitely (no expiration)
4. Session survives browser restart (persistent storage)

**Business Impact:**
- Complete account takeover
- Unauthorized access to financial records, tenant data, maintenance tickets
- Privilege escalation to Super Admin if compromised account has elevated permissions

**Remediation:**

```typescript
// Step 1: Implement secure session tokens with httpOnly cookies
// Backend: server/middleware/auth.js
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'rathinam-nexus' }
  );
};

const setSecureCookie = (res, token) => {
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });
};

// Step 2: Update AuthContext to use secure cookies
// src/contexts/AuthContext.tsx
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include', // Send cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (response.ok) {
    const user = await response.json();
    setUser(user);
    setRole(user.role);
    // NO localStorage - session in httpOnly cookie
  }
};

// Step 3: Add session validation middleware
const validateSession = async (req, res, next) => {
  const token = req.cookies.session_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid session' });
  }
};
```

**Priority:** P0 - Deploy within 48 hours

---

### 2.2 Plain Text Tenant Passwords (CVSS 8.7 - CRITICAL)

**Vulnerability:** Tenant user passwords stored in plain text in `tenants` table.

**Location:** Database schema - `tenants.password` field

**Attack Vector:**
1. SQL injection or database breach exposes `tenants` table
2. Attacker gains plain text passwords for all tenant users
3. Credential stuffing attacks on other services using same passwords

**Business Impact:**
- Immediate exposure of all tenant credentials
- Regulatory violation (GDPR Article 32, CCPA)
- Legal liability for data breach notification
- Loss of customer trust and potential contract terminations

**Remediation:**

```sql
-- Step 1: Add password hashing for tenants table
-- File: supabase/migrations/add_tenant_password_encryption.sql

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add hashed password column
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Migrate existing passwords (one-time operation)
UPDATE public.tenants 
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password_hash IS NULL AND password IS NOT NULL;

-- Drop plain text column
ALTER TABLE public.tenants DROP COLUMN IF EXISTS password;

-- Rename password_hash to password
ALTER TABLE public.tenants RENAME COLUMN password_hash TO password;

-- Create trigger for auto-hashing
CREATE OR REPLACE FUNCTION hash_tenant_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS NOT NULL AND NOT (NEW.password LIKE '$2%') THEN
    NEW.password = crypt(NEW.password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hash_tenant_password_trigger ON public.tenants;
CREATE TRIGGER hash_tenant_password_trigger
  BEFORE INSERT OR UPDATE OF password ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION hash_tenant_password();

-- Create verification function for tenant login
CREATE OR REPLACE FUNCTION verify_tenant_password(tenant_email TEXT, tenant_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_password TEXT;
BEGIN
  SELECT password INTO stored_password
  FROM public.tenants
  WHERE email = tenant_email;
  
  IF stored_password IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_password = crypt(tenant_password, stored_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_tenant_password(TEXT, TEXT) TO anon, authenticated;
```

```typescript
// Step 2: Update AuthContext to use tenant password verification
// src/contexts/AuthContext.tsx (tenant login section)

// Replace plain text comparison
const { data: tenantData, error: tenantError } = await supabase
  .from('tenants')
  .select('*')
  .eq('email', email)
  .maybeSingle();

if (!tenantError && tenantData) {
  // Use RPC for password verification
  const { data: isValid } = await supabase
    .rpc('verify_tenant_password', { 
      tenant_email: email, 
      tenant_password: password 
    });
  
  if (isValid) {
    appUser = { /* tenant user object */ };
    passwordValid = true;
  }
}
```

**Priority:** P0 - Deploy within 24 hours

---

### 2.3 Missing API Rate Limiting (CVSS 7.5 - HIGH)

**Vulnerability:** No rate limiting on authentication endpoints or API routes.

**Location:** `server/index.js` - Missing rate limiting middleware

**Attack Vector:**
1. Brute force attack on `/api/auth/login` with 1000+ requests/second
2. Credential stuffing using leaked password databases
3. DoS attack flooding any API endpoint
4. Resource exhaustion causing service outage

**Business Impact:**
- Service unavailability during business hours
- Successful brute force compromise of weak passwords
- Infrastructure costs spike from attack traffic
- Legitimate users unable to access system

**Remediation:**

```javascript
// Step 1: Install rate limiting package
// npm install express-rate-limit

// Step 2: Configure rate limiters
// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Strict limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded, try again later'
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };

// Step 3: Apply to routes
// server/index.js
const { authLimiter, apiLimiter, uploadLimiter } = require('./middleware/rateLimiter');

// Apply to authentication
app.post('/api/auth/login', authLimiter, loginHandler);

// Apply to all API routes
app.use('/api/', apiLimiter);

// Apply to uploads
app.post('/api/upload', uploadLimiter, uploadHandler);
app.post('/api/upload-multiple', uploadLimiter, uploadHandler);
```

**Priority:** P0 - Deploy within 72 hours

---

### 2.4 Exposed Supabase Anonymous Key (CVSS 7.2 - HIGH)

**Vulnerability:** Supabase anonymous key hardcoded in frontend environment variables.

**Location:** `.env` file, compiled into frontend bundle

**Attack Vector:**
```javascript
// Exposed in frontend bundle
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Exploitation:**
1. Attacker extracts key from browser DevTools or source code
2. Direct database queries bypass application logic
3. RLS policies are only defense (if misconfigured = full access)
4. Potential data exfiltration or manipulation

**Business Impact:**
- Direct database access if RLS policies have gaps
- Bypass of business logic validation
- Potential data modification or deletion
- Exposure of sensitive tenant/financial data

**Remediation:**

```sql
-- Step 1: Audit and strengthen RLS policies
-- File: supabase/migrations/strengthen_rls.sql

-- Ensure ALL tables have RLS enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Restrict users table to authenticated users only
DROP POLICY IF EXISTS "Users can only view own data" ON public.users;
CREATE POLICY "Users can only view own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

-- Restrict tenants to own data
DROP POLICY IF EXISTS "Tenants view own data" ON public.tenants;
CREATE POLICY "Tenants view own data" ON public.tenants
  FOR SELECT USING (auth.uid()::text = id OR email = auth.jwt()->>'email');

-- Restrict invoices to tenant's own invoices
DROP POLICY IF EXISTS "Tenants view own invoices" ON public.invoices;
CREATE POLICY "Tenants view own invoices" ON public.invoices
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE email = auth.jwt()->>'email'
    )
  );

-- Prevent anonymous access to sensitive tables
DROP POLICY IF EXISTS "Block anon access" ON public.users;
CREATE POLICY "Block anon access" ON public.users
  FOR ALL USING (auth.role() = 'authenticated');
```

```javascript
// Step 2: Implement backend proxy for Supabase calls
// server/routes/supabaseProxy.js
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side only
);

app.post('/api/secure/query', validateSession, async (req, res) => {
  const { table, operation, filters } = req.body;
  
  // Validate user has permission for this operation
  if (!hasPermission(req.user, table, operation)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Execute query with service role (bypasses RLS safely)
  const { data, error } = await supabaseAdmin
    .from(table)
    .select()
    .match(filters);
  
  res.json({ data, error });
});
```

**Priority:** P1 - Deploy within 1 week

---

## 3. High/Medium Risk Vulnerabilities

### 3.1 Missing CSRF Protection (CVSS 6.8 - MEDIUM)

**Vulnerability:** No CSRF tokens on state-changing operations.

**Remediation:**

```javascript
// Install: npm install csurf cookie-parser
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Send token to frontend
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Frontend: Include token in requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(data)
});
```

**Priority:** P1

---

### 3.2 Unrestricted File Upload (CVSS 6.5 - MEDIUM)

**Vulnerability:** Insufficient file type validation, no malware scanning.

**Location:** `server/index.js` - Multer configuration

**Remediation:**

```javascript
// server/middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ALLOWED_TYPES[file.mimetype];
  
  if (!allowedExts || !allowedExts.includes(ext)) {
    return cb(new Error('Invalid file type'), false);
  }
  
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || 'general';
    const uploadPath = path.join(__dirname, '../uploads', category);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${hash}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10
  }
});

module.exports = upload;
```

**Priority:** P1

---

### 3.3 Permissive CORS Configuration (CVSS 5.8 - MEDIUM)

**Vulnerability:** CORS allows all origins.

**Remediation:**

```javascript
// server/index.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};

app.use(cors(corsOptions));
```

**Priority:** P2

---

### 3.4 Missing Input Validation (CVSS 5.5 - MEDIUM)

**Vulnerability:** No request validation middleware.

**Remediation:**

```javascript
// Install: npm install express-validator
const { body, validationResult } = require('express-validator');

// Example: User creation validation
app.post('/api/users', [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['Admin', 'Accountant', 'Viewer', 'Technician'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

**Priority:** P2

---

### 3.5 SQL Injection via Supabase Filters (CVSS 5.3 - MEDIUM)

**Vulnerability:** User input directly passed to Supabase queries.

**Remediation:**

```typescript
// BAD: Direct user input
const { data } = await supabase
  .from('tenants')
  .select()
  .eq('email', userInput); // Potential injection

// GOOD: Parameterized queries (Supabase handles this)
const { data } = await supabase
  .from('tenants')
  .select()
  .eq('email', sanitizeInput(userInput));

// Sanitization helper
const sanitizeInput = (input: string): string => {
  return input.replace(/[^\w\s@.-]/gi, '');
};
```

**Priority:** P2

---

## 4. Architecture & DevOps Security

### 4.1 Environment Variable Exposure

**Risk:** `.env` files committed to repository or exposed in logs.

**Remediation:**
- Add `.env` to `.gitignore`
- Use secret management (AWS Secrets Manager, HashiCorp Vault)
- Rotate all exposed credentials immediately

```bash
# .gitignore
.env
.env.local
.env.production
server/.env
```

---

### 4.2 Docker Security Hardening

**Current Risk:** Running as root, no security scanning.

**Remediation:**

```dockerfile
# Dockerfile - Security hardened
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./
COPY --from=frontend-build /app/dist ./client/build
# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
CMD ["node", "index.js"]
```

```yaml
# docker-compose.yml - Add security options
services:
  rathinam-techpark:
    image: naveen171007/rathinam-techpark:1.5.4
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

---

### 4.3 Nginx Security Headers

**Remediation:**

```nginx
# nginx.conf - Add security headers
server {
    listen 80;
    server_name your-domain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Hide server version
    server_tokens off;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
    }
    
    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

---

## 5. Actionable Remediation Checklist

### Phase 1: Critical Fixes (Week 1)

- [ ] **Day 1-2:** Implement bcrypt hashing for tenant passwords
  - [ ] Run migration script
  - [ ] Update AuthContext tenant login logic
  - [ ] Test tenant login flow
  - [ ] Force password reset for all tenants

- [ ] **Day 2-3:** Replace localStorage with httpOnly cookies
  - [ ] Install jsonwebtoken package
  - [ ] Create JWT generation/validation middleware
  - [ ] Update AuthContext to use cookies
  - [ ] Test session persistence and expiration
  - [ ] Clear all existing localStorage sessions

- [ ] **Day 3-4:** Implement API rate limiting
  - [ ] Install express-rate-limit
  - [ ] Configure limiters for auth, API, uploads
  - [ ] Apply to all routes
  - [ ] Monitor rate limit hits in logs

- [ ] **Day 4-5:** Strengthen RLS policies
  - [ ] Audit all table policies
  - [ ] Run RLS strengthening migration
  - [ ] Test with anonymous Supabase key
  - [ ] Verify data isolation between tenants

### Phase 2: High Priority (Week 2)

- [ ] **Day 6-7:** Add CSRF protection
  - [ ] Install csurf package
  - [ ] Implement token generation endpoint
  - [ ] Update frontend to include tokens
  - [ ] Test all state-changing operations

- [ ] **Day 8-9:** Harden file upload security
  - [ ] Implement strict file type validation
  - [ ] Add file size limits per category
  - [ ] Scan uploads with ClamAV or VirusTotal API
  - [ ] Store uploads outside web root

- [ ] **Day 10:** Configure CORS properly
  - [ ] Define allowed origins in environment
  - [ ] Update CORS middleware
  - [ ] Test cross-origin requests

### Phase 3: Medium Priority (Week 3-4)

- [ ] **Week 3:** Input validation
  - [ ] Install express-validator
  - [ ] Add validation to all POST/PUT routes
  - [ ] Sanitize user inputs
  - [ ] Test with malicious payloads

- [ ] **Week 3:** Security headers
  - [ ] Update Nginx configuration
  - [ ] Add CSP, HSTS, X-Frame-Options
  - [ ] Test with securityheaders.com

- [ ] **Week 4:** Docker hardening
  - [ ] Run containers as non-root
  - [ ] Add security options to compose file
  - [ ] Scan images with Trivy
  - [ ] Implement read-only filesystem

### Phase 4: Monitoring & Compliance (Ongoing)

- [ ] **Logging & Monitoring:**
  - [ ] Implement centralized logging (ELK, Datadog)
  - [ ] Log all authentication attempts
  - [ ] Alert on suspicious activity
  - [ ] Monitor rate limit violations

- [ ] **Security Testing:**
  - [ ] Run OWASP ZAP automated scans weekly
  - [ ] Conduct manual penetration testing quarterly
  - [ ] Perform dependency vulnerability scans (npm audit)
  - [ ] Review and rotate secrets every 90 days

- [ ] **Compliance:**
  - [ ] Document security controls for SOC 2
  - [ ] Implement data retention policies
  - [ ] Create incident response plan
  - [ ] Conduct security awareness training

---

## 6. Additional Recommendations

### 6.1 Implement Security Monitoring

```javascript
// server/middleware/securityLogger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' })
  ]
});

const logSecurityEvent = (req, event, details) => {
  securityLogger.info({
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    details
  });
};

module.exports = { logSecurityEvent };
```

### 6.2 Implement Password Policy

```typescript
// src/utils/passwordPolicy.ts
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) errors.push('Minimum 12 characters required');
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Must contain special character');
  
  return { valid: errors.length === 0, errors };
};
```

### 6.3 Implement Account Lockout

```javascript
// server/middleware/accountLockout.js
const loginAttempts = new Map();

const checkAccountLockout = (email) => {
  const attempts = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    throw new Error('Account locked. Try again in 30 minutes.');
  }
  
  return attempts;
};

const recordFailedLogin = (email) => {
  const attempts = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  attempts.count++;
  
  if (attempts.count >= 5) {
    attempts.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    attempts.count = 0;
  }
  
  loginAttempts.set(email, attempts);
};

const resetLoginAttempts = (email) => {
  loginAttempts.delete(email);
};

module.exports = { checkAccountLockout, recordFailedLogin, resetLoginAttempts };
```

---

## 7. Compliance Mapping

| Vulnerability | OWASP Top 10 | CWE | GDPR Article | SOC 2 Control |
|---------------|--------------|-----|--------------|---------------|
| localStorage sessions | A07:2021 | CWE-522 | Art. 32 | CC6.1 |
| Plain text passwords | A02:2021 | CWE-256 | Art. 32 | CC6.1 |
| No rate limiting | A04:2021 | CWE-770 | - | CC7.2 |
| Exposed API keys | A01:2021 | CWE-798 | Art. 32 | CC6.1 |
| Missing CSRF | A01:2021 | CWE-352 | - | CC6.1 |
| File upload risks | A03:2021 | CWE-434 | - | CC6.6 |

---

## 8. Conclusion

The Rathinam Nexus Suite requires immediate security remediation to protect tenant data and maintain regulatory compliance. The implementation of bcrypt password hashing for system users is a positive step, but critical gaps remain in session management, tenant password security, and API protection.

**Immediate Actions (Next 7 Days):**
1. Encrypt tenant passwords with bcrypt
2. Replace localStorage with httpOnly cookies
3. Implement API rate limiting
4. Strengthen Supabase RLS policies

**Estimated Remediation Effort:** 3-4 weeks for full implementation

**Risk if Unaddressed:** High probability of data breach within 6 months based on current threat landscape.

---

**Report End**
