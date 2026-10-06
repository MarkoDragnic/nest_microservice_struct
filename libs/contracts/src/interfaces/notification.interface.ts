import { NotificationTypes } from '../types/notifications/notification.types';

export interface INotificationUser {
  email: string;
  notifyByEmail: boolean;
}

export interface INotificationPositionData {
  user: INotificationUser;
  symbol: string;
  robotName: string;
  openedAt: string;
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
