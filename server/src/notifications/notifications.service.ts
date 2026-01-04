import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // Use loose typing to avoid dependency on @types
  private transporter: any = null;
  private from: string;

  constructor(private readonly cfg: ConfigService) {
    const host = cfg.get<string>('SMTP_HOST');
    const port = parseInt(cfg.get<string>('SMTP_PORT') || '0', 10) || 587;
    const user = cfg.get<string>('SMTP_USER');
    const pass = cfg.get<string>('SMTP_PASS');
    this.from = cfg.get<string>('SMTP_FROM') || user || 'no-reply@example.com';
    if (host && user && pass) {
      try {
        // Require nodemailer only when SMTP is configured to avoid crashing if the dependency is missing
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nm = require('nodemailer');
        this.transporter = nm.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      } catch (e) {
        this.logger.warn('nodemailer is not installed; emails will be disabled');
      }
    } else {
      this.logger.warn('SMTP is not configured; emails will be skipped');
    }
  }

  async send(to: string, subject: string, text: string, html?: string) {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (e) {
      this.logger.error('Email send failed', e as any);
      return false;
    }
  }

  async invoiceCreated(to: string, data: { number: string; total?: number; date?: Date }) {
    const subject = `Счет ${data.number} создан`;
    const text = `Создан счет ${data.number} на сумму ${data.total ?? ''}. Дата: ${data.date?.toISOString().slice(0,10) ?? ''}`;
    return this.send(to, subject, text);
  }

  async invoiceOverdue(to: string, data: { number: string; dueDate: Date; total?: number; paid?: number }) {
    const subject = `Просрочка по счету ${data.number}`;
    const text = `Счет ${data.number} просрочен. Срок оплаты: ${data.dueDate.toISOString().slice(0,10)}. Оплачено: ${data.paid ?? 0} из ${data.total ?? ''}.`;
    return this.send(to, subject, text);
  }

  async reservationExpired(to: string, data: { premise?: string; until?: Date }) {
    const subject = `Бронь истекла`;
    const text = `Ваша бронь${data.premise ? ' на ' + data.premise : ''} истекла к ${data.until?.toISOString().slice(0,10) ?? ''}.`;
    return this.send(to, subject, text);
  }

  async indexationApplied(to: string, data: { leaseNumber?: string; factor: number; from: Date }) {
    const subject = `Изменение индексации договора ${data.leaseNumber ?? ''}`;
    const text = `Применена индексация ${data.factor} с ${data.from.toISOString().slice(0,10)}.`;
    return this.send(to, subject, text);
  }

  async signedUploaded(to: string, data: { leaseNumber?: string }) {
    const subject = `Подписанный договор загружен ${data.leaseNumber ?? ''}`;
    const text = `Подписанный договор был загружен.`;
    return this.send(to, subject, text);
  }

  async actReady(to: string, data: { invoiceNumber?: string }) {
    const subject = `Акт готов (${data.invoiceNumber ?? ''})`;
    const text = `Акт готов к скачиванию.`;
    return this.send(to, subject, text);
  }
}
