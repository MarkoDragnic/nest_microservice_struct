import { NotificationTypes } from '../types/notifications/notification.types';
import { UserResponseDto } from '../dto/user/user-response.dto';

export interface INotificationPositionData {
  user: UserResponseDto;
  symbol: string;
  robotName: string;
  openedAt: Date;
  closedAt?: string;
  entryPrice: number;
  closePrice?: number;
  quantity: number;
  positionId: string;
  profit?: number;
}

export interface INotificationPositionMailDto {
  type: NotificationTypes;
  data: INotificationPositionData;
}
