import { buildWithProps } from './props-builder';

describe('props-builder', () => {
  describe('buildWithProps', () => {
    it('generates withProps with inject call using provided token', () => {
      const result = buildWithProps('FLIGHT_API_BASE_PATH');
      expect(result).toContain('withProps(() => ({');
      expect(result).toContain('_baseUrl: inject(FLIGHT_API_BASE_PATH)');
      expect(result).toContain('}))');
    });
  });
});

