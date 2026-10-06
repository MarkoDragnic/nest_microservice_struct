import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoDbFactory {
  constructor(@InjectConnection() private readonly baseConnection: Connection) {}

  /**
   * Returns a mongoose Connection bound to the given database name.
   * Uses mongoose's internal cache so repeated calls are cheap.
   */
  getDb(dbName?: string): Connection {
    if (!dbName) {
      return this.baseConnection;
    }
    return this.baseConnection.useDb(dbName, { useCache: true });
  }
}
