// /.netlify/functions/makePDF.js
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function makePDF(htmlText) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const decoded = htmlText.replace(/&nbsp;/g, ' ');
  
  const lines = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n##H1##$1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n##H2##$1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\n##STRONG##$1\n')
    .replace(/<(s|strike)[^>]*>(.*?)<\/(s|strike)>/gi, '\n##STRIKE##$2\n')
    .replace(/<[^>]+>/g, '')
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  let y = height - 50;
  const normalLineHeight = 16;

  for (const line of lines) {
    let fontSize = 12;
    let drawFont = font;
    let lineHeight = normalLineHeight;

    if (line.startsWith('##H1##')) {
      fontSize = 20;
      drawFont = fontBold;
      lineHeight = 28;
    } else if (line.startsWith('##H2##') || line.startsWith('##STRONG##')) {
      fontSize = 14;
      drawFont = fontBold;
      lineHeight = 20;
    }

    const clean = line.replace(/^##(H1|H2|STRONG|STRIKE)##/, '');

    page.drawText(clean, {
      x: 50,
      y,
      size: fontSize,
      font: drawFont,
      color: rgb(0, 0, 0),
      maxWidth: width - 100,
    });

    if (line.startsWith('##STRIKE##')) {
      const textWidth = drawFont.widthOfTextAtSize(clean, fontSize);
      const strikeY = y + fontSize * 0.35;
      page.drawLine({
        start: { x: 50, y: strikeY },
        end: { x: 50 + textWidth, y: strikeY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    }

    y -= lineHeight;
    if (y < 50) {
      page = pdfDoc.addPage();
      y = page.getSize().height - 50;
    }
  }

  return pdfDoc.save();
}