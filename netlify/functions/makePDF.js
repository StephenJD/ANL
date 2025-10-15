// server-only: netlify/functions/makePDF.js

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function makePDF(htmlText) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const text = htmlText.replace(/<[^>]+>/g, '').replace(/<br\s*\/?>/g, '\n'); // crude HTML-to-text
  page.drawText(text, { x: 50, y: height - 50, size: fontSize, font, color: rgb(0, 0, 0) });
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { makePDF };