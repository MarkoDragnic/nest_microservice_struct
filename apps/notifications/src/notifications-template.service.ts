import { Injectable, NotImplementedException } from '@nestjs/common';
import { INotificationPositionMailDto, NotificationTypes } from '@app/contracts';
import { NotifyEmailDto } from './types/email-notification.types';

@Injectable()
export class NotificationsTemplateService {
  getMailTemplate(notification: INotificationPositionMailDto): NotifyEmailDto {
    return {
      email: notification.data.user.email,
      ...this.getTemplate(notification),
    };
  }

  private getTemplate(notification: INotificationPositionMailDto) {
    const { type, data } = notification;
    switch (type) {
      case NotificationTypes.POSITION_OPEN:
        return {
          subject: `Position opened - ${data.symbol}`,
          text: `Hi,
          A new position has been opened.
          
          Symbol: ${data.symbol}
          
          Opened at: ${data.openedAt}
          Entry price: ${data.entryPrice}
          Quantity: ${data.quantity}
          
          Position ID: ${data.positionId}
          
          >> Trading Bot Notifications <<`,
        };
      case NotificationTypes.POSITION_CLOSE:
        return {
          subject: `Position closed - ${data.symbol} (P/L: ${data.profit})`,
          text: `Hi,
          Your position has been closed.
          
          Symbol: ${data.symbol}
          
          Opened at: ${data.openedAt}
          Closed at: ${data.closedAt}
          
          Entry price: ${data.entryPrice}
          Close price:${data.closePrice}
          
          Quantity: ${data.quantity}
          Profit/Loss: ${data.profit}
          
          Position ID: ${data.positionId}
          >> Trading Bot Notifications <<`,
        };
      default:
        throw new NotImplementedException();
    }
  }
}
