import { describe, expect, it } from 'vitest';
import type { CreatorStyleProfileV1 } from '@core/types/creatorDelivery';
import { validateCreatorStyle } from './creatorStyleService';
const profile: CreatorStyleProfileV1 = {
  schemaVersion: 1,
  id: 'style',
  name: 'Warm',
  primaryColor: '#123abc',
  textColor: '#ffffff',
  fontFamily: 'Noto Sans',
  creativeDescription: 'Warm light',
  updatedAt: 1,
};
describe('creator style validation', () => {
  it('accepts a named style with bundled fonts and hex colors', () => {
    expect(() => validateCreatorStyle(profile)).not.toThrow();
  });
  it('rejects invalid CSS, empty names and fonts not bundled with the app', () => {
    expect(() =>
      validateCreatorStyle({ ...profile, primaryColor: 'url(http://external)' }),
    ).toThrow();
    expect(() => validateCreatorStyle({ ...profile, name: ' ' })).toThrow();
    expect(() =>
      validateCreatorStyle({ ...profile, fontFamily: 'External Font' as 'Noto Sans' }),
    ).toThrow();
  });
});
