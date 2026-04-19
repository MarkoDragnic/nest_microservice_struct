import { IIndicatorsConfig } from '@app/common/interfaces';

export class RobotIndicatorsUpdatePayloadDto {
  robotId: string;
  indicators: IIndicatorsConfig;
}
