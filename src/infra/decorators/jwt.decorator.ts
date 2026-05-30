import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from 'src/shared/domain/entities/input/jwt-payload.entity';
import { JwtPayloadDto } from '../auth/jwt-payload.dto';

export const JwtExport = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayloadDto }>();
    const jwtData = request.user;
    const jwtCommand = JwtPayload.fromDto(jwtData);
    if (!jwtCommand) {
      throw new UnauthorizedException('JWT é ausente ou inválido');
    }
    return jwtCommand;
  },
);
