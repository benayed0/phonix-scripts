import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

@Injectable()
export class PdfService {
  async createPdf(qrImages: { filename: string; dataUrl: string }[]) {
    const stream = new PassThrough();
    const doc = new PDFDocument({ size: 'A4' });
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginX = 50;
    const marginY = 50;
    const qrSize = 100;
    const labelHeight = 20;
    const boxWidth = 150;
    const boxHeight = 150;

    // Calculate how many QR codes fit per row and per page
    const qrPerRow = Math.floor((pageWidth - 2 * marginX) / boxWidth);
    const rowsPerPage = Math.floor((pageHeight - 2 * marginY) / boxHeight);
    const qrPerPage = qrPerRow * rowsPerPage;

    console.log(
      `Layout: ${qrPerRow} per row, ${rowsPerPage} rows per page, ${qrPerPage} per page`,
    );

    for (let i = 0; i < qrImages.length; i++) {
      const qrData = qrImages[i];

      // Calculate position on current page
      const pageIndex = Math.floor(i / qrPerPage);
      const positionOnPage = i % qrPerPage;
      const row = Math.floor(positionOnPage / qrPerRow);
      const col = positionOnPage % qrPerRow;

      // Add new page if needed (but not for the first QR code)
      if (i > 0 && positionOnPage === 0) {
        doc.addPage();
        console.log(`Added page ${pageIndex + 1} for QR code ${i + 1}`);
      }

      // Calculate exact coordinates
      const x = marginX + col * boxWidth;
      const y = marginY + row * boxHeight;

      console.log(
        `QR ${i + 1}: Page ${pageIndex + 1}, Position (${col}, ${row}), Coordinates (${x}, ${y})`,
      );

      try {
        // Decode and add QR image
        const imageBuffer = Buffer.from(qrData.dataUrl.split(',')[1], 'base64');

        doc.image(imageBuffer, x, y, {
          width: qrSize,
          height: qrSize,
        });

        // Add label below QR code
        doc.fontSize(10).text(qrData.filename, x, y + qrSize + 5, {
          width: qrSize,
          align: 'center',
          height: labelHeight,
        });
      } catch (error) {
        console.error(`Error processing QR code ${i + 1}:`, error);

        // Draw a placeholder rectangle if image fails
        doc
          .rect(x, y, qrSize, qrSize)
          .stroke()
          .fontSize(8)
          .text('ERROR', x, y + qrSize / 2, {
            width: qrSize,
            align: 'center',
          });
      }
    }
    doc.end();
    return stream;
  }
}
