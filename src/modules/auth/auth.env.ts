export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function requireIntEnv(name: string): number {
  const raw = requireEnv(name);
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Environment variable ${name} must be a positive integer, got: ${raw}`,
    );
  }
  return parsed;
}
