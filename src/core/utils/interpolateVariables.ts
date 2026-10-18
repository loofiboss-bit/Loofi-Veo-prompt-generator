/**
 * Replaces {{KEY}} in text with values from the variables object.
 */
export const interpolateVariables = (text: string, variables: Record<string, string>): string => {
  if (!text) return '';
  return text.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] || match; // Return original {{KEY}} if missing, to signal error to user
  });
};
