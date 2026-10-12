import type { IndicatorsUpdateDto } from '../../dto/indicator/indicators-update.dto';

// userId is the authenticated user, set by gateway, never read from the request body.
export type RobotIndicatorsUpdateData = IndicatorsUpdateDto & { userId: string };
