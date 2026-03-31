/**
 * Simple mustache-style template renderer.
 * Replaces {{variableName}} with values from the vars map.
 * Unknown keys are left as-is.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
