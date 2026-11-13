import { NotFoundException } from '@nestjs/common';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { AbstractDocument } from './abstract.schema';
import { LoggerService } from '@app/core/logger';

export abstract class MongoAbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: LoggerService;
  constructor(protected readonly model: Model<TDocument>) {}

  async create(document: Omit<TDocument, '_id'>, id: string = ''): Promise<TDocument> {
    const createdDocument = new this.model({
      ...document,
      _id: id ? id : new Types.ObjectId(),
    });
    return (await createdDocument.save()).toJSON() as TDocument;
  }

  async findOne(filterQuery: QueryFilter<TDocument>): Promise<TDocument> {
    const document = await this.model.findOne(filterQuery).lean<TDocument>(true);
    if (!document) {
      this.logger.warn(`Document not found with filter: ${JSON.stringify(filterQuery)}`);
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async findOneAndUpdate(filterQuery: QueryFilter<TDocument>, update: UpdateQuery<TDocument>): Promise<TDocument> {
    const document = await this.model
      .findOneAndUpdate(filterQuery, update, {
        new: true,
      })
      .lean<TDocument>(true);
    if (!document) {
      this.logger.warn(`Document not found with filter: ${JSON.stringify(filterQuery)}`);
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async find(filterQuery: QueryFilter<TDocument>): Promise<TDocument[]> {
    return this.model.find(filterQuery).lean<TDocument[]>(true);
  }

  async findOneAndDelete(filterQuery: QueryFilter<TDocument>) {
    return this.model.findOneAndDelete(filterQuery).lean<TDocument>(true);
  }
}
