/** Contextual editors share the existing asset drawer without changing project navigation. */
export const OPEN_ASSET_LIBRARY_EVENT = 'loofi:open-asset-library';

export function openAssetLibrary(): void {
  window.dispatchEvent(new Event(OPEN_ASSET_LIBRARY_EVENT));
}
