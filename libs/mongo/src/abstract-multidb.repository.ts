import { Logger, NotFoundException } from '@nestjs/common';
import { Model, QueryFilter, Schema, Types, UpdateQuery } from 'mongoose';

import { AbstractDocument } from './abstract.schema';
import { MongoDbFactory } from './mongo-db.factory';

export abstract class AbstractMultiDbRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;

  protected constructor(
    protected readonly dbFactory: MongoDbFactory,
    private readonly modelName: string,
    private readonly schema: Schema<TDocument>,
  ) {}

  protected getModel(dbName?: string): Model<TDocument> {
    const connection = this.dbFactory.getDb(dbName);
    return connection.model<TDocument>(this.modelName, this.schema);
  }

  async create(dbName: string | undefined, document: Omit<TDocument, '_id'>, id: string = ''): Promise<TDocument> {
    const model = this.getModel(dbName);
    const createdDocument = new model({
      ...document,
      _id: id ? id : new Types.ObjectId(),
    });
    return (await createdDocument.save()).toJSON() as TDocument;
  }

  async findOne(dbName: string | undefined, filterQuery: QueryFilter<TDocument>): Promise<TDocument> {
    const model = this.getModel(dbName);
    const document = await model.findOne(filterQuery).lean<TDocument>(true);
    if (!document) {
      this.logger.warn(`Document not found with filter: ${JSON.stringify(filterQuery)}`);
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async findOneAndUpdate(
    dbName: string | undefined,
    filterQuery: QueryFilter<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<TDocument> {
    const model = this.getModel(dbName);
    const document = await model
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

  async find(dbName: string | undefined, filterQuery: QueryFilter<TDocument>): Promise<TDocument[]> {
    const model = this.getModel(dbName);
    return model.find(filterQuery).lean<TDocument[]>(true);
  }

  async findOneAndDelete(dbName: string | undefined, filterQuery: QueryFilter<TDocument>) {
    const model = this.getModel(dbName);
    return model.findOneAndDelete(filterQuery).lean<TDocument>(true);
  }
}
