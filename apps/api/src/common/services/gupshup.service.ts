import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/** Shape of a Gupshup send-message API response. */
interface GupshupResponse {
  status: string;
  messageId?: string;
}

/**
 * GupshupService handles WhatsApp outbound messaging via the Gupshup BSP REST API.
 *
 * All calls are direct HTTP — no third-party SDK.
 * API reference: Gupshup Partner API v1 (WhatsApp Business API).
 */
@Injectable()
export class GupshupService {
  private readonly logger = new Logger(GupshupService.name);

  /** Gupshup API base URL for sending messages. */
  private readonly BASE_URL = 'https://api.gupshup.io/wa/api/v1/msg';

  private readonly apiKey: string;
  private readonly appName: string;
  private readonly sourceNumber: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('GUPSHUP_API_KEY');
    this.appName = config.getOrThrow<string>('GUPSHUP_APP_NAME');
    this.sourceNumber = config.getOrThrow<string>('GUPSHUP_WHATSAPP_NUMBER');
  }

  /**
   * Sends a PDF document to the given phone number via WhatsApp.
   *
   * Uses the Gupshup document message type so the recipient can open
   * and download the PDF receipt directly in WhatsApp.
   *
   * @param phone         Recipient phone in E.164 format (91XXXXXXXXXX).
   * @param documentUrl   Pre-signed S3 URL (1hr TTL) for the PDF file.
   * @param filename      Display filename shown in the WhatsApp message.
   * @param caption       Optional text caption shown below the document.
   * @returns             The Gupshup message ID from the API response.
   */
  async sendDocument(
    phone: string,
    documentUrl: string,
    filename: string,
    caption?: string,
  ): Promise<string> {
    const message = JSON.stringify({
      type: 'file',
      url: documentUrl,
      filename,
      ...(caption ? { caption } : {}),
    });

    // Gupshup API uses application/x-www-form-urlencoded encoding
    const params = new URLSearchParams({
      channel: 'whatsapp',
      source: this.sourceNumber,
      destination: phone,
      message,
      'src.name': this.appName,
    });

    const response = await axios.post<GupshupResponse>(
      this.BASE_URL,
      params.toString(),
      {
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15_000, // 15 second timeout — Gupshup is generally fast
      },
    );

    const messageId = response.data.messageId ?? 'unknown';
    this.logger.log(
      `WhatsApp document sent to ${phone} [messageId=${messageId}]`,
    );
    return messageId;
  }
}
