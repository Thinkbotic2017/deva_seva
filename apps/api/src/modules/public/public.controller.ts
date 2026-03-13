import { Controller, Get, Post, Param, Body, HttpCode } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PublicService } from './public.service';
import { PublicDonateDto } from './dto/public-donate.dto';
import { PublicSevaDto } from './dto/public-seva.dto';

/**
 * PublicController serves the iframe-embeddable donation and seva portal.
 * ALL routes are decorated with @Public() — no JWT required.
 * templeId is ALWAYS derived from the :slug path param, never from the client body.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /**
   * Returns temple info, active donation categories, and online-bookable seva types.
   * GET /api/v1/public/:slug
   */
  @Get(':slug')
  @Public()
  getPortalData(@Param('slug') slug: string) {
    return this.publicService.getPortalData(slug);
  }

  /**
   * Creates a Razorpay order for an online donation.
   * POST /api/v1/public/:slug/donate/initiate
   */
  @Post(':slug/donate/initiate')
  @Public()
  @HttpCode(200)
  initiateDonate(@Param('slug') slug: string, @Body() dto: PublicDonateDto) {
    return this.publicService.initiateDonate(slug, dto);
  }

  /**
   * Creates a PENDING seva booking and a Razorpay order.
   * POST /api/v1/public/:slug/seva/initiate
   */
  @Post(':slug/seva/initiate')
  @Public()
  @HttpCode(200)
  initiateSeva(@Param('slug') slug: string, @Body() dto: PublicSevaDto) {
    return this.publicService.initiateSeva(slug, dto);
  }
}
