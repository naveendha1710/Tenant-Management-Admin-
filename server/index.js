require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 209715200; // 200MB default

// Ensure required directories exist
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const configDir = path.join(__dirname, 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize SMTP config if not exists
const smtpConfigPath = path.join(configDir, 'smtpConfig.json');
if (!fs.existsSync(smtpConfigPath)) {
  fs.writeFileSync(smtpConfigPath, JSON.stringify({
    host: '',
    port: '',
    secure: false,
    user: '',
    pass: '',
    from: ''
  }, null, 2));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded, try again later'
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 emails per hour
  message: 'Email limit exceeded, try again later'
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Security: Sanitize file paths
const sanitizePath = (filePath) => {
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  return normalized;
};

// Multer configuration with category support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || req.body.category || 'general';
    const sanitizedCategory = sanitizePath(category);
    const categoryPath = path.join(UPLOAD_PATH, sanitizedCategory);
    
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }
    cb(null, categoryPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = sanitizePath(file.originalname).replace(/[\s'"]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Add file type validation if needed
    cb(null, true);
  }
});

// Logging middleware for ALL routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes - MUST be before static file serving
app.post('/api/upload', uploadLimiter, upload.single('file'), (req, res) => {
  try {
    console.log('[UPLOAD] Received upload request:', {
      category: req.query.category,
      file: req.file ? req.file.originalname : 'none'
    });
    
    if (!req.file) {
      console.error('[UPLOAD] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const category = req.query.category || req.body.category || 'general';
    const file = req.file;

    console.log('[UPLOAD] File uploaded successfully:', file.filename);
    
    const fileUrl = `/uploads/${category}/${file.filename}`;
    
    res.json({ 
      success: true, 
      file: {
        name: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        category: category,
        path: fileUrl,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('[UPLOAD] Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

app.delete('/api/delete', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    const sanitized = sanitizePath(filePath.replace('/uploads/', ''));
    const fullPath = path.resolve(path.join(UPLOAD_PATH, sanitized));
    const uploadDir = path.resolve(UPLOAD_PATH);

    if (!fullPath.startsWith(uploadDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Multiple file upload endpoint
app.post('/api/upload-multiple', uploadLimiter, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const category = req.query.category || req.body.category || 'general';
    const files = req.files.map(file => ({
      name: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      category: category,
      path: `/uploads/${category}/${file.filename}`,
      url: `/uploads/${category}/${file.filename}`
    }));

    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve uploaded files with security
app.get('/uploads/*', (req, res) => {
  const sanitized = sanitizePath(decodeURIComponent(req.path.replace('/uploads/', '')));
  const filePath = path.resolve(path.join(UPLOAD_PATH, sanitized));
  const uploadDir = path.resolve(UPLOAD_PATH);
  
  if (!filePath.startsWith(uploadDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.set('Cache-Control', 'public, max-age=31536000');
  res.sendFile(filePath);
});

// Alternative API endpoint for serving files
app.get('/api/files/*', (req, res) => {
  const sanitized = sanitizePath(decodeURIComponent(req.path.replace('/api/files/', '')));
  const filePath = path.resolve(path.join(UPLOAD_PATH, sanitized));
  const uploadDir = path.resolve(UPLOAD_PATH);
  
  if (!filePath.startsWith(uploadDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.set('Cache-Control', 'public, max-age=31536000');
  res.sendFile(filePath);
});

// Asset Management Routes - Temporarily disabled
// const assetRoutes = require('./routes/assetRoutes');
// app.use('/api/assets', assetRoutes);

// SMTP Configuration Routes
const emailService = require('./services/emailService');

// Get SMTP configuration (password masked)
app.get('/api/admin/smtp/get', (req, res) => {
  try {
    const config = emailService.loadSMTPConfig();
    if (!config) {
      return res.json({ host: '', port: '', secure: false, user: '', pass: '', from: '' });
    }
    // Mask password
    res.json({ ...config, pass: config.pass ? '******' : '' });
  } catch (error) {
    console.error('Error loading SMTP config:', error);
    res.status(500).json({ error: 'Failed to load SMTP configuration' });
  }
});

// Save SMTP configuration
app.post('/api/admin/smtp/save', (req, res) => {
  try {
    const { host, port, secure, user, pass, from } = req.body;
    
    // Validation
    if (!host || !port || !user || !from) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(from.split('<')[1]?.replace('>', '') || from)) {
      return res.status(400).json({ error: 'Invalid from email format' });
    }
    
    // Validate port
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({ error: 'Invalid port number' });
    }
    
    const configPath = path.join(__dirname, 'config', 'smtpConfig.json');
    let currentConfig = {};
    
    // Load existing config to preserve password if not changed
    if (fs.existsSync(configPath)) {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    const newConfig = {
      host,
      port: portNum.toString(),
      secure: secure === true || secure === 'true',
      user,
      pass: pass === '******' ? currentConfig.pass : pass, // Keep old password if masked
      from
    };
    
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    
    res.json({ success: true, message: 'SMTP configuration saved successfully' });
  } catch (error) {
    console.error('Error saving SMTP config:', error);
    res.status(500).json({ error: 'Failed to save SMTP configuration' });
  }
});

// Send email (for notification system)
app.post('/api/admin/smtp/send', emailLimiter, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' });
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Check if SMTP is configured
    const config = emailService.loadSMTPConfig();
    if (!config || !config.host || !config.user) {
      return res.status(400).json({ error: 'SMTP not configured' });
    }
    
    const result = await emailService.sendEmail({ to, subject, text, html });
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Send test email
app.post('/api/admin/smtp/test', emailLimiter, async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address required' });
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Check if SMTP is configured
    const config = emailService.loadSMTPConfig();
    if (!config || !config.host || !config.user) {
      return res.status(400).json({ error: 'SMTP not configured. Please save SMTP settings first.' });
    }
    
    const result = await emailService.sendTestEmail(testEmail);
    res.json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// Get email logs
app.get('/api/admin/smtp/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = emailService.getEmailLogs(limit);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// Reset SMTP config to default
app.post('/api/admin/smtp/reset', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config', 'smtpConfig.json');
    const defaultConfig = {
      host: '',
      port: '',
      secure: false,
      user: '',
      pass: '',
      from: ''
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    res.json({ success: true, message: 'SMTP configuration reset to default' });
  } catch (error) {
    console.error('Error resetting SMTP config:', error);
    res.status(500).json({ error: 'Failed to reset SMTP configuration' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[HEALTH] Health check called');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uploadPath: UPLOAD_PATH,
    port: PORT
  });
});

// Test upload endpoint
app.get('/api/test', (req, res) => {
  console.log('[TEST] Test endpoint called');
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// API 404 handler - catches unmatched API routes
app.use('/api/*', (req, res) => {
  console.error('API route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler for API routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Serve React static files (AFTER API routes)
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Favicon fallback
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'client', 'build', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(204).end();
  }
});

// SPA fallback - serve index.html for all non-API routes (MUST BE LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// List all registered routes on startup
function listRoutes() {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path
      });
    }
  });
  return routes;
}

// Start server
app.listen(PORT, () => {
  console.log(`✓ Unified server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(`✓ Uploads at http://localhost:${PORT}/uploads`);
  console.log(`✓ React app at http://localhost:${PORT}`);
  console.log('\n✓ Registered API routes:');
  listRoutes().forEach(route => {
    if (route.path.startsWith('/api')) {
      console.log(`  ${route.method} ${route.path}`);
    }
  });
  console.log('');
});
