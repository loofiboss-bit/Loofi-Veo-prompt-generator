import { logger } from '@core/services/loggerService';

export const CORE_STUDIO_ROUTES = [
  { id: 'image', route: '/?studio=image' },
  { id: 'suno', route: '/studio?mode=music' },
  { id: 'video', route: '/?studio=video' },
] as const;

/**
 * Built-in core studios mount directly as typed application routes/dialogs.
 * Privileged internal plugin bypass registration is disabled so PluginManager
 * governs strictly sandboxed external plugins.
 */
export const registerInternalPlugins = async () => {
  logger.info('[CoreStudios] Using typed core studio routes');
  return CORE_STUDIO_ROUTES;
};
