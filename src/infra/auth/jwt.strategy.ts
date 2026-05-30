import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayloadDto } from './jwt-payload.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET_KEY'),
    });
  }

  validate(payload: Record<string, unknown>): JwtPayloadDto {
    if (!payload['sub'] || typeof payload['sub'] !== 'string') {
      throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
    }
    return { sub: payload['sub'] };
  }
}
