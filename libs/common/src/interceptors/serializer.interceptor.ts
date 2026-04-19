import { CallHandler, ExecutionContext, NestInterceptor, UseInterceptors } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';

interface IConstructor {
  new (...arg: any[]): {};
}

class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: IConstructor) {}
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data) => {
        if (data.error) {
          return data;
        }
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}

export function Serializer(dto: IConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}
