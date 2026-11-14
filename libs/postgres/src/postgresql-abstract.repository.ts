import { NotFoundException } from '@nestjs/common';
import { AbstractEntity } from './abstract.entity';
import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { LoggerService } from '@app/core/logger';
import { PaginatedResponseDto } from '@app/contracts/dto';

export abstract class PostgresqlAbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: LoggerService;

  constructor(protected readonly repository: Repository<T>) {}

  async create(entity: T): Promise<T> {
    const instance = this.repository.create(entity as any) as unknown as T;
    return this.repository.save(instance);
  }

  async findOne(where: FindOptionsWhere<T>, relations?: FindOptionsRelations<T>): Promise<T> {
    const entity = await this.repository.findOne({ where, relations });

    if (!entity) {
      this.logger.warn('Entity not found with where', where);
      throw new NotFoundException('Entity not found.');
    }

    return entity;
  }

  async findOneAndUpdate(where: FindOptionsWhere<T>, partialEntity: QueryDeepPartialEntity<T>): Promise<T> {
    const updateResult = await this.repository.update(where, partialEntity);

    if (!updateResult.affected) {
      this.logger.warn('Entity not found with where', where);
      throw new NotFoundException('Entity not found.');
    }

    return this.findOne(where);
  }

  async find(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.findBy(where);
  }

  async findPaginated(
    where: FindOptionsWhere<T>,
    page: number = 1,
    limit: number = 20,
    relations?: FindOptionsRelations<T>,
  ): Promise<PaginatedResponseDto<T>> {
    const [data, total] = await this.repository.findAndCount({
      where,
      relations,
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOneAndDelete(where: FindOptionsWhere<T>): Promise<void> {
    const deleteResult = await this.repository.delete(where);

    if (!deleteResult.affected) {
      this.logger.warn('Entity not found with where', where);
      throw new NotFoundException('Entity not found.');
    }
  }
}
