import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/infra/auth/public.decorator';
import { DocumentPublicEndpoint } from 'src/infra/decorators/document-api-endpoint.decorator';

@ApiTags('Health')
@Controller('health-check')
export class HealthController {
  @DocumentPublicEndpoint({
    summary: 'Verificação de saúde do sistema',
    description:
      'Endpoint público para verificar o status de saúde da API. Retorna "ok" quando o sistema está funcionando corretamente. Utilizado para monitoramento e health checks de infraestrutura.',
  })
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'golden-raspberry-backend',
    };
  }
}
