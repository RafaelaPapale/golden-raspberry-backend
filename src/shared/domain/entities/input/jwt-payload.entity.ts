import { JwtPayloadDto } from 'src/infra/auth/jwt-payload.dto';

export class JwtPayload {
  constructor(public readonly sub: string) {}

  static fromDto(dto: JwtPayloadDto): JwtPayload {
    if (!dto.sub) {
      throw new Error('Campos obrigatórios ausentes');
    }
    return new JwtPayload(dto.sub);
  }
}
