import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { FirebaseService } from '../firebase/firebase.service';
import { PdfService } from '../pdf/pdf.service';
import { PassThrough } from 'stream';

@Injectable()
export class QrService {
  constructor(
    private firebase: FirebaseService,
    private pdf: PdfService,
  ) {}
  async generateBatch(count: number): Promise<PassThrough> {
    const ref = this.firebase.getRef('Production/Appareils/PlugQrCode');
    const data = (await ref.once('value')).val() || [];
    const existingNumbers = (Array.isArray(data) ? data : Object.values(data))
      .map((item: string) => parseInt(item.split('_')[0], 10))
      .filter((n) => !isNaN(n));

    let nextNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    let nextIndex = Array.isArray(data)
      ? data.length
      : Object.keys(data).length;

    const qrImages: { filename: string; dataUrl: string }[] = [];

    for (let i = 0; i < count; i++) {
      const formattedNumber = String(nextNumber).padStart(2, '0');
      const randomPart = String(Math.floor(Math.random() * 1000)).padStart(
        3,
        '0',
      );
      const qrContent = `https://www.dlaf564fazef55com_protocolxX54dnxxxz${formattedNumber}_${randomPart}.com`;

      const dataUrl = await QRCode.toDataURL(qrContent);

      qrImages.push({
        filename: `p_${formattedNumber}_${randomPart}`,
        dataUrl,
      });
      await ref
        .child(String(nextIndex))
        .set(`${formattedNumber}_${randomPart}`);

      nextNumber++;
      nextIndex++;
    }

    return await this.pdf.createPdf(qrImages);
  }
}
