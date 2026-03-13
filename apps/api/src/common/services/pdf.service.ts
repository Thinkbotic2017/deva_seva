import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { Donation } from '../../database/entities/donation.entity';
import { Temple } from '../../database/entities/temple.entity';

/** Generates 80G-compliant donation receipts as PDF buffers using Puppeteer. */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generates a PDF receipt buffer for the given donation and temple.
   *
   * Rules:
   * - Runs headless Chrome (Puppeteer). No external URLs in the HTML template.
   * - All styles are inlined — no CDN, no google fonts, no remote images.
   * - The caller is responsible for uploading the buffer to S3.
   */
  async generateDonationReceipt(
    donation: Donation,
    temple: Temple,
  ): Promise<Buffer> {
    this.logger.log(`Generating receipt PDF for donation ${donation.id}`);

    const html = this.buildReceiptHtml(donation, temple);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      // Set HTML content directly — no external URL fetches
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Builds the full HTML string for the receipt.
   * All CSS is inline. No references to external resources.
   */
  private buildReceiptHtml(donation: Donation, temple: Temple): string {
    const [pyear, pmonth, pday] = donation.paymentDate.split('-').map(Number);
    const dateObj = new Date(pyear!, pmonth! - 1, pday!);
    const paymentDate = dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const amount = parseFloat(donation.amount).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    });

    const templeAddress = [
      temple.addressLine1,
      temple.city,
      temple.state,
    ]
      .filter(Boolean)
      .join(', ');

    const eighty_g_section = temple.is80gRegistered && temple.number80g
      ? `
        <tr>
          <td class="label">80G Reg. No.</td>
          <td class="value">${temple.number80g}</td>
        </tr>
        ${temple.panNumber ? `<tr><td class="label">Temple PAN</td><td class="value">${temple.panNumber}</td></tr>` : ''}
      `
      : '';

    const pan_section = donation.donorPanMasked
      ? `<tr><td class="label">Donor PAN</td><td class="value">${donation.donorPanMasked}</td></tr>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Donation Receipt — ${donation.receiptNumber ?? donation.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      color: #1C1B1F;
      background: #fff;
      padding: 0;
    }
    .page {
      max-width: 780px;
      margin: 0 auto;
      padding: 32px;
      border: 2px solid #E8530A;
      border-radius: 8px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #E8530A;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .temple-name {
      font-size: 22px;
      font-weight: 700;
      color: #7A1F00;
      margin-bottom: 4px;
    }
    .temple-address {
      font-size: 12px;
      color: #49454F;
    }
    .receipt-title {
      font-size: 18px;
      font-weight: 700;
      color: #E8530A;
      margin-top: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .receipt-number {
      font-size: 12px;
      color: #49454F;
      margin-top: 4px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #49454F;
      margin-bottom: 20px;
    }
    .amount-box {
      background: #FDE8D8;
      border: 2px solid #E8530A;
      border-radius: 8px;
      text-align: center;
      padding: 12px 20px;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 12px;
      color: #49454F;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .amount-value {
      font-size: 28px;
      font-weight: 700;
      color: #7A1F00;
      margin: 4px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    td.label {
      width: 40%;
      padding: 8px 12px;
      font-size: 12px;
      color: #49454F;
      background: #FEF9F3;
      border: 1px solid #E8D8CC;
      font-weight: 600;
    }
    td.value {
      width: 60%;
      padding: 8px 12px;
      font-size: 13px;
      color: #1C1B1F;
      border: 1px solid #E8D8CC;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #79747E;
      border-top: 1px solid #E8D8CC;
      padding-top: 12px;
      margin-top: 8px;
    }
    .eligibility-note {
      font-size: 11px;
      color: #B33D05;
      text-align: center;
      margin-bottom: 16px;
      font-style: italic;
    }
    .watermark {
      font-size: 10px;
      color: #79747E;
      text-align: right;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="temple-name">${temple.name}</div>
      ${templeAddress ? `<div class="temple-address">${templeAddress}</div>` : ''}
      <div class="receipt-title">Donation Receipt</div>
      <div class="receipt-number">Receipt No: ${donation.receiptNumber ?? '—'}</div>
    </div>

    <div class="meta-row">
      <span>Date: ${paymentDate}</span>
      <span>Mode: ${donation.mode}</span>
    </div>

    <div class="amount-box">
      <div class="amount-label">Amount Received</div>
      <div class="amount-value">${amount}</div>
    </div>

    <table>
      <tr>
        <td class="label">Donor Name</td>
        <td class="value">${donation.donorName}</td>
      </tr>
      ${donation.donorPhone ? `<tr><td class="label">Phone</td><td class="value">${donation.donorPhone}</td></tr>` : ''}
      ${pan_section}
      ${donation.paymentReference ? `<tr><td class="label">Reference No.</td><td class="value">${donation.paymentReference}</td></tr>` : ''}
      <tr>
        <td class="label">Fiscal Year</td>
        <td class="value">${donation.fiscalYear}</td>
      </tr>
      ${eighty_g_section}
    </table>

    ${donation.is80gEligible ? '<p class="eligibility-note">This donation is eligible for tax exemption under Section 80G of the Income Tax Act, 1961.</p>' : ''}

    <div class="footer">
      This is a computer-generated receipt and does not require a signature.
      <br />Thank you for your generous contribution. Jay Shree Ram. 🙏
    </div>
    <div class="watermark">DevaSeva Platform</div>
  </div>
</body>
</html>`;
  }
}
