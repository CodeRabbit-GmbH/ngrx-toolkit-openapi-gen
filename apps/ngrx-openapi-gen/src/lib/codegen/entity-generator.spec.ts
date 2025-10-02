import { OpenAPIV3 } from 'openapi-types';
import { EntityGenerator, buildEntityIndex } from './entity-generator';
import { DomainSpec, EntitySpec, SchemaOrRef } from '../spec';

describe('EntityGenerator', () => {
  const generator = new EntityGenerator();

  const flightEntity: EntitySpec = {
    name: 'Flight',
    schemaRef: '#/components/schemas/Flight',
    primaryKey: 'id',
    properties: [
      { name: 'id', schema: { type: 'string' }, optional: false },
      { name: 'number', schema: { type: 'string' }, optional: false },
      {
        name: 'status',
        schema: { type: 'string', enum: ['scheduled', 'delayed'] },
        optional: false,
      },
      { name: 'from', schema: { type: 'string', nullable: true }, optional: true },
    ],
    description: 'Flight entity with schedule information.',
  };

  const bookingEntity: EntitySpec = {
    name: 'Booking',
    schemaRef: '#/components/schemas/Booking',
    primaryKey: 'id',
    properties: [
      { name: 'id', schema: { type: 'string' }, optional: false },
      { name: 'passenger', schema: { type: 'string' }, optional: false },
      { name: 'flight', schema: { $ref: '#/components/schemas/Flight' }, optional: true },
    ],
  };

  const flightDomain: DomainSpec = {
    name: 'Flight',
    entities: [flightEntity],
    operations: [],
  };

  const bookingDomain: DomainSpec = {
    name: 'Booking',
    entities: [bookingEntity],
    operations: [],
  };

  const entityIndex = buildEntityIndex([flightDomain, bookingDomain]);

  describe('generateEntity', () => {
    it('generates interface with correct name', () => {
      const result = generator.generateEntity(flightEntity, 'flight', entityIndex);
      expect(result.content).toContain('export interface FlightModel');
    });

    it('generates correct file path', () => {
      const result = generator.generateEntity(flightEntity, 'flight', entityIndex);
      expect(result.path).toBe('flight/entities/flight.model.ts');
    });

    it('includes primary key constant', () => {
      const result = generator.generateEntity(flightEntity, 'flight', entityIndex);
      expect(result.content).toContain("export const FLIGHT_PRIMARY_KEY = 'id' as const;");
    });

    it('renders properties with correct types', () => {
      const result = generator.generateEntity(flightEntity, 'flight', entityIndex);
      expect(result.content).toContain('id: string;');
      expect(result.content).toContain('number: string;');
      expect(result.content).toContain("status: 'scheduled' | 'delayed';");
    });

    it('renders optional properties with question mark', () => {
      const result = generator.generateEntity(flightEntity, 'flight', entityIndex);
      expect(result.content).toContain('from?: string | null;');
    });

    it('includes schema reference comment', () => {
      const result = generator.generateEntity(flightEntity, 'flight', entityIndex);
      expect(result.content).toContain('// Schema reference: #/components/schemas/Flight');
    });

    it('adds import for referenced models', () => {
      const result = generator.generateEntity(bookingEntity, 'booking', entityIndex);
      expect(result.content).toContain("import type { FlightModel } from '../../flight/entities/flight.model';");
    });

    it('renders ref types with Model suffix', () => {
      const result = generator.generateEntity(bookingEntity, 'booking', entityIndex);
      expect(result.content).toContain('flight?: FlightModel;');
    });
  });

  describe('generateDomainEntities', () => {
    it('generates all entities in domain', () => {
      const results = generator.generateDomainEntities(flightDomain, entityIndex);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('flight/entities/flight.model.ts');
    });
  });

  describe('buildEntityIndex', () => {
    it('maps entity names to their locations', () => {
      const index = buildEntityIndex([flightDomain, bookingDomain]);

      expect(index.get('Flight')).toEqual({
        domainPath: 'flight',
        entitySlug: 'flight',
      });

      expect(index.get('Booking')).toEqual({
        domainPath: 'booking',
        entitySlug: 'booking',
      });
    });
  });
});
