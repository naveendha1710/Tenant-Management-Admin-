// Sanitize user input to prevent XSS attacks
export const sanitizeHTML = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

export const sanitizeAttribute = (input: string): string => {
  return input.replace(/[<>"'&]/g, (char) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;'
    };
    return entities[char] || char;
  });
};

export const sanitizeFilePath = (input: string): string => {
  // Remove path traversal attempts and dangerous characters
  return input.replace(/\.\./g, '').replace(/[<>:"|?*\x00-\x1F]/g, '_');
};
