import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from 'src/application/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('deve retornar status ok', () => {
      const result = controller.check();
      expect(result.status).toBe('ok');
    });

    it('deve retornar service como golden-raspberry-backend', () => {
      const result = controller.check();
      expect(result.service).toBe('golden-raspberry-backend');
    });

    it('deve retornar um timestamp no formato ISO', () => {
      const result = controller.check();
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('deve retornar objeto com as três chaves esperadas', () => {
      const result = controller.check();
      expect(Object.keys(result)).toEqual(
        expect.arrayContaining(['status', 'timestamp', 'service']),
      );
    });
  });
});
