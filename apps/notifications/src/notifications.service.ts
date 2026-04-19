import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotifyEmailDto } from './types/email-notification.types';

@Injectable()
export class NotificationsService {
  private readonly transport;
  private readonly smtpUser: string;
  private readonly oauthClientId: string;
  private readonly oauthClientSecret: string;
  private readonly oauthRefreshToken: string;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.smtpUser = this.configService.get<string>('SMTP_USER') ?? '';
    this.oauthClientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID') ?? '';
    this.oauthClientSecret = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';
    this.oauthRefreshToken = this.configService.get<string>('GOOGLE_OAUTH_REFRESH_TOKEN') ?? '';
    this.fromAddress = `"No Reply" <${this.smtpUser}>`;

    this.transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: this.smtpUser,
        clientId: this.oauthClientId,
        clientSecret: this.oauthClientSecret,
        refreshToken: this.oauthRefreshToken,
      },
    });
  }

  async sendEmailNotification({ email, subject, text }: NotifyEmailDto) {
    await this.transport.sendMail({
      from: this.fromAddress,
      to: email,
      subject: subject,
      text,
    });
  }
}
