import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'filmes' })
export class FilmeModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'year', type: 'int' })
  year!: number;

  @Column({ name: 'title', type: 'varchar' })
  title!: string;

  @Column({ name: 'studios', type: 'varchar' })
  studios!: string;

  @Column({ name: 'producer', type: 'varchar' })
  producer!: string;

  @Column({ name: 'winner', type: 'boolean', default: false })
  winner!: boolean;
}
