import { describe, expect, it } from 'vitest';
import { toSuggestion } from './index';

describe('Photon suggestions', () => {
  it('builds a readable label from a city feature', () => {
    const feature = { properties: { osm_type: 'R', osm_id: 1553098, name: 'Gdańsk', state: 'województwo pomorskie', country: 'Polska' } };
    expect(toSuggestion(feature)).toEqual({
      id: 'R1553098',
      description: 'Gdańsk, województwo pomorskie, Polska',
      mainText: 'Gdańsk',
      secondaryText: 'województwo pomorskie, Polska',
    });
  });

  it('uses the street address when there is no name and drops duplicate parts', () => {
    const feature = { properties: { osm_type: 'N', osm_id: 1, street: 'Długa', housenumber: '5', city: 'Gdańsk', state: 'Gdańsk', country: 'Polska' } };
    expect(toSuggestion(feature)).toMatchObject({ mainText: 'Długa 5', secondaryText: 'Gdańsk, Polska' });
  });
});
