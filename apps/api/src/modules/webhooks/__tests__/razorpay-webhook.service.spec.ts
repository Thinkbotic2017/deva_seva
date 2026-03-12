import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RazorpayWebhookService } from '../razorpay-webhook.service';
import { DonationsService } from '../../donations/donations.service';
import { DonationStatus } from '@devaseva/types';
import { RazorpayWebhookPayload } from '../razorpay-webhook.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test-webhook-secret-32-chars-xxxx';

/** Computes the expected HMAC-SHA256 hex for a given body + secret. */
function computeHmac(body: Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function makePayload(event: string, orderId: string, paymentId: string): RazorpayWebhookPayload {
  return {
    event,
    account_id: 'acc_test',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 510000, // ₹5100 in paise
          currency: 'INR',
          status: event === 'payment.captured' ? 'captured' : 'failed',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RazorpayWebhookService', () => {
  let service: RazorpayWebhookService;
  let donationsService: jest.Mocked<DonationsService>;

  beforeEach(async () => {
    donationsService = {
      findByRazorpayOrderId: jest.fn(),
      confirmOnlinePayment: jest.fn().mockResolvedValue(undefined),
      cancelDonation: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DonationsService>;

    const module = await Test.createTestingModule({
      providers: [
        RazorpayWebhookService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'RAZORPAY_WEBHOOK_SECRET') return WEBHOOK_SECRET;
              throw new Error(`Unexpected key: ${key}`);
            }),
          },
        },
        { provide: DonationsService, useValue: donationsService },
      ],
    }).compile();

    service = module.get(RazorpayWebhookService);
  });

  // ─── verifySignature ─────────────────────────────────────────────────────

  describe('verifySignature', () => {
    it('accepts a correctly computed HMAC-SHA256 signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const validSig = computeHmac(body, WEBHOOK_SECRET);

      expect(() => service.verifySignature(body, validSig)).not.toThrow();
    });

    it('throws UnauthorizedException for a wrong signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const wrongSig = 'a'.repeat(64); // 32 bytes of 'a' in hex

      expect(() => service.verifySignature(body, wrongSig)).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for an empty signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

      expect(() => service.verifySignature(body, '')).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if signature is for a different body', () => {
      const originalBody = Buffer.from('{"event":"payment.captured"}');
      const tamperedBody = Buffer.from('{"event":"payment.captured","amount":1}');
      const sigForOriginal = computeHmac(originalBody, WEBHOOK_SECRET);

      // Tampered body with a signature computed for the original body must fail
      expect(() => service.verifySignature(tamperedBody, sigForOriginal)).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if signature was computed with a different secret', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const sigWithWrongSecret = computeHmac(body, 'wrong-secret');

      expect(() => service.verifySignature(body, sigWithWrongSecret)).toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── handle — payment.captured ───────────────────────────────────────────

  describe('handle payment.captured', () => {
    it('calls confirmOnlinePayment with donationId and paymentId', async () => {
      const payload = makePayload('payment.captured', 'order_123', 'pay_abc');
      donationsService.findByRazorpayOrderId.mockResolvedValue({
        id: 'donation-uuid',
        status: DonationStatus.PENDING,
      } as never);

      await service.handle(payload);

      expect(donationsService.confirmOnlinePayment).toHaveBeenCalledWith(
        'donation-uuid',
        'pay_abc',
        expect.any(Date),
      );
    });

    it('is idempotent — skips if donation is already CONFIRMED', async () => {
      const payload = makePayload('payment.captured', 'order_123', 'pay_abc');
      donationsService.findByRazorpayOrderId.mockResolvedValue({
        id: 'donation-uuid',
        status: DonationStatus.CONFIRMED,
      } as never);

      // confirmOnlinePayment itself handles the idempotency;
      // the webhook service should still call it and let it decide
      await service.handle(payload);
      expect(donationsService.confirmOnlinePayment).toHaveBeenCalledTimes(1);
    });

    it('logs a warning and returns when the order is not found — no error thrown', async () => {
      const payload = makePayload('payment.captured', 'order_unknown', 'pay_abc');
      donationsService.findByRazorpayOrderId.mockResolvedValue(null);

      // Must not throw
      await expect(service.handle(payload)).resolves.toBeUndefined();
      expect(donationsService.confirmOnlinePayment).not.toHaveBeenCalled();
    });
  });

  // ─── handle — payment.failed ─────────────────────────────────────────────

  describe('handle payment.failed', () => {
    it('calls cancelDonation with the donation id', async () => {
      const payload = makePayload('payment.failed', 'order_123', 'pay_abc');
      donationsService.findByRazorpayOrderId.mockResolvedValue({
        id: 'donation-uuid',
        status: DonationStatus.PENDING,
      } as never);

      await service.handle(payload);

      expect(donationsService.cancelDonation).toHaveBeenCalledWith('donation-uuid');
    });

    it('logs a warning and returns when the order is not found — no error thrown', async () => {
      const payload = makePayload('payment.failed', 'order_unknown', 'pay_abc');
      donationsService.findByRazorpayOrderId.mockResolvedValue(null);

      await expect(service.handle(payload)).resolves.toBeUndefined();
      expect(donationsService.cancelDonation).not.toHaveBeenCalled();
    });
  });

  // ─── handle — unknown events ─────────────────────────────────────────────

  describe('handle unknown events', () => {
    it('silently ignores unrecognised event types', async () => {
      const payload = makePayload('order.paid', 'order_123', 'pay_abc');
      donationsService.findByRazorpayOrderId.mockResolvedValue(null);

      await expect(service.handle(payload)).resolves.toBeUndefined();
      expect(donationsService.confirmOnlinePayment).not.toHaveBeenCalled();
      expect(donationsService.cancelDonation).not.toHaveBeenCalled();
    });
  });
});
