import { Injectable } from '@nestjs/common';
import { FilmeModel } from 'src/infra/database/models/premiacoes/filme.model';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

@Injectable()
export class FilmeMapper {
  toDomain(model: FilmeModel): Filme {
    return new Filme({
      id: model.id,
      year: model.year,
      title: model.title,
      studios: model.studios,
      producer: model.producer,
      winner: model.winner,
    });
  }

  toPersistence(entity: Filme): FilmeModel {
    const model = new FilmeModel();
    model.year = entity.year;
    model.title = entity.title;
    model.studios = entity.studios;
    model.producer = entity.producer;
    model.winner = entity.winner;
    return model;
  }
}
