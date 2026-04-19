import { Injectable } from '@nestjs/common';

@Injectable()
export class GeneralService {
  isEnumKey = <T extends object>(enumObject: T, value: PropertyKey): value is keyof T =>
    Object.prototype.hasOwnProperty.call(enumObject, value);

  isEnumValue = <T extends object>(enumObject: T, value: PropertyKey): value is keyof T =>
    Object.values(enumObject).includes(value as T[keyof T]);

}
