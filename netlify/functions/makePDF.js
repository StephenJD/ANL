// Server-only: netlify/functions/makePDF.js
// - Converts HTML to readable PDF
// - Large title, bold headings, preserves line breaks

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function makePDF(htmlText) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const lines = htmlText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(h1)>/gi, '\n$1\n')          // mark <h1>
    .replace(/<\/?(h2|strong)>/gi, '\n$1\n')   // mark <h2> & <strong>
    .replace(/<[^>]+>/g, '')                   // strip remaining tags
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length);

  let y = height - 50;
  const lineHeight = 16;

  for (const line of lines) {
    let fontSize = 12;
    let drawFont = font;

    if (line.toLowerCase() === 'h1') {
      fontSize = 20;
      drawFont = fontBold;
      continue; // skip marker line
    }
    if (line.toLowerCase() === 'h2' || line.toLowerCase() === 'strong') {
      fontSize = 14;
      drawFont = fontBold;
      continue; // skip marker line
    }

    page.drawText(line, { x: 50, y, size: fontSize, font: drawFont, color: rgb(0, 0, 0) });
    y -= lineHeight;
    if (y < 50) {
      // add new page
      const newPage = pdfDoc.addPage();
      y = newPage.getSize().height - 50;
      page = newPage;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { makePDF };
