import { IIndicatorsConfig } from '@app/contracts/interfaces';

export class RobotIndicatorsUpdatePayloadDto {
  robotId: string;
  ownerId: string;
  indicators: IIndicatorsConfig;
}
