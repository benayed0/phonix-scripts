import { Controller, Get, Param, Res } from '@nestjs/common';
import { QrService } from 'src/services/qr/qr.service';
import { Response } from 'express';

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('generate/:count')
  async generate(@Param('count') count = 1, @Res() res: Response) {
    console.log(count);

    const stream = await this.qrService.generateBatch(Number(count));
    const filename = `qr_codes_batch_${count}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    });

    stream.pipe(res);
  }
}
