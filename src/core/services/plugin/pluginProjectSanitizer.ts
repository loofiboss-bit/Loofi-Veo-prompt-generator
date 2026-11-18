/**
 * Plugin Project Data Sanitizer
 * Restricts plugin project access to minimal, non-sensitive summary DTOs
 * and allowlisted metadata mutations.
 */

export interface PluginProjectSourceShape {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  status?: unknown;
  tags?: unknown;
  lastModified?: unknown;
  createdAt?: unknown;
  modifiedAt?: unknown;
  schemaVersion?: unknown;
  sceneCount?: unknown;
  storyboard?: { scenes?: unknown[] };
}

export interface SanitizedPluginProjectDto {
  id: string;
  name: string;
  description?: string;
  status?: string;
  tags?: string[];
  lastModified: number;
  createdAt?: number;
  modifiedAt?: number;
  schemaVersion?: number;
  sceneCount: number;
}

const ALLOWED_PROJECT_UPDATE_KEYS = new Set(['name', 'description', 'tags']);

/**
 * Project a full Project record down to non-sensitive metadata for plugins.
 */
export function sanitizeProjectForPlugin(
  project: PluginProjectSourceShape,
): SanitizedPluginProjectDto {
  const sceneCount = Array.isArray(project.storyboard?.scenes)
    ? project.storyboard.scenes.length
    : typeof project.sceneCount === 'number'
      ? project.sceneCount
      : 0;

  const dto: SanitizedPluginProjectDto = {
    id: String(project.id ?? ''),
    name: String(project.name ?? ''),
    lastModified:
      typeof project.lastModified === 'number'
        ? project.lastModified
        : typeof project.modifiedAt === 'number'
          ? project.modifiedAt
          : 0,
    sceneCount,
  };

  if (typeof project.description === 'string') dto.description = project.description;
  if (typeof project.status === 'string') dto.status = project.status;
  if (Array.isArray(project.tags)) {
    dto.tags = project.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 32);
  }
  if (typeof project.createdAt === 'number') dto.createdAt = project.createdAt;
  if (typeof project.modifiedAt === 'number') dto.modifiedAt = project.modifiedAt;
  if (typeof project.schemaVersion === 'number') dto.schemaVersion = project.schemaVersion;

  return dto;
}

/**
 * Extract only safe, allowlisted project metadata fields from a plugin save request.
 */
export function sanitizePluginProjectUpdates(updates: unknown): Record<string, string | string[]> {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new Error('Invalid project updates: expected a plain object.');
  }

  const sanitized: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
    if (!ALLOWED_PROJECT_UPDATE_KEYS.has(key)) continue;
    if (key === 'name' || key === 'description') {
      if (typeof value === 'string') {
        sanitized[key] = value.slice(0, 2000);
      }
    } else if (key === 'tags' && Array.isArray(value)) {
      sanitized.tags = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.slice(0, 64))
        .slice(0, 32);
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new Error('Plugin project update rejected: no allowlisted metadata fields provided.');
  }

  return sanitized;
}
