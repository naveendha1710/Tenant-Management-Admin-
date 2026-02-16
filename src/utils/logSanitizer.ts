// Sanitize log output to prevent log injection attacks
export const sanitizeLog = (input: any): string => {
  if (input === null || input === undefined) {
    return String(input);
  }
  
  const str = String(input);
  // Remove newlines, carriage returns, and other control characters
  return str.replace(/[\n\r\t\x00-\x1F\x7F]/g, '');
};

export const sanitizeLogObject = (obj: any): string => {
  try {
    return sanitizeLog(JSON.stringify(obj));
  } catch {
    return sanitizeLog(String(obj));
  }
};
