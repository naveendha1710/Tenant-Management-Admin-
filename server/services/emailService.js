/**
 * Email Service - SMTP Email Sending with Dynamic Configuration
 * 
 * Features:
 * - Reads SMTP config from smtpConfig.json
 * - Supports .env overrides (higher priority)
 * - Logs all email sends to emailLogs.json
 * - Supports HTML content and attachments
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/smtpConfig.json');
const LOGS_PATH = path.join(__dirname, '../logs/emailLogs.json');

/**
 * Load SMTP configuration
 * Priority: .env > smtpConfig.json
 */
function loadSMTPConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.warn('SMTP config file not found, using defaults');
      return {
        host: process.env.SMTP_HOST || '',
        port: process.env.SMTP_PORT || '',
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || ''
      };
    }

    const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    return {
      host: process.env.SMTP_HOST || fileConfig.host || '',
      port: process.env.SMTP_PORT || fileConfig.port || '',
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : fileConfig.secure,
      user: process.env.SMTP_USER || fileConfig.user || '',
      pass: process.env.SMTP_PASS || fileConfig.pass || '',
      from: process.env.SMTP_FROM || fileConfig.from || ''
    };
  } catch (error) {
    console.error('Error loading SMTP config:', error);
    return null;
  }
}

function createTransporter() {
  const config = loadSMTPConfig();
  
  if (!config || !config.host || !config.user) {
    console.warn('SMTP not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

function logEmail(to, subject, status, messageId = null, error = null) {
  try {
    let logs = [];
    if (fs.existsSync(LOGS_PATH)) {
      logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8'));
    }

    logs.push({
      to,
      subject,
      timestamp: new Date().toISOString(),
      status,
      messageId,
      error: error ? error.message : null
    });

    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Error logging email:', err);
  }
}

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  const transporter = createTransporter();
  
  if (!transporter) {
    const error = new Error('SMTP not configured');
    logEmail(to, subject, 'failed', null, error);
    throw error;
  }

  const config = loadSMTPConfig();

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
      attachments
    });

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      to
    });

    logEmail(to, subject, 'success', info.messageId);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    logEmail(to, subject, 'failed', null, error);
    throw error;
  }
}

async function sendTestEmail(testEmail) {
  return sendEmail({
    to: testEmail,
    subject: 'Test Email from Rathinam Nexus Suite',
    text: 'This is a test email to verify SMTP configuration.',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">SMTP Configuration Test</h2>
        <p>This is a test email from <strong>Rathinam Nexus Suite</strong>.</p>
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          Sent at: ${new Date().toLocaleString()}<br>
          System: Rathinam Nexus Suite
        </p>
      </div>
    `
  });
}

function getEmailLogs(limit = 100) {
  try {
    if (!fs.existsSync(LOGS_PATH)) {
      return [];
    }
    const logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8'));
    return logs.slice(-limit).reverse();
  } catch (error) {
    console.error('Error reading email logs:', error);
    return [];
  }
}

module.exports = {
  sendEmail,
  sendTestEmail,
  loadSMTPConfig,
  getEmailLogs
};
