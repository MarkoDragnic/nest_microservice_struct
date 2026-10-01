import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';


@Injectable()
export class SerializerService {
  serialize<T>(dto: new (...args: any[]) => T, data: any): T {
    return plainToInstance(dto, data, {
      excludeExtraneousValues: true,
    });
  }
}