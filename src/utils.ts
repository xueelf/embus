export function objectToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export function parseError(error: unknown): string {
  return error instanceof Error ? error.message : objectToString(error);
}
