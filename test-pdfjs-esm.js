// Test pdfjs-dist legacy build with ESM import
const fs = require('fs');

const PDF_PATH = '/Users/henry/.openclaw/media/inbound/24f76dcd-2dba-44e3-bd32-8bb1134972e5.pdf';

async function testPdfJsLegacy() {
  console.log('=== Testing pdfjs-dist legacy build (ESM) ===');
  
  const buffer = fs.readFileSync(PDF_PATH);
  const uint8Array = new Uint8Array(buffer);
  
  console.log('Buffer size:', uint8Array.length);
  
  // Dynamic ESM import of legacy build
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const loadingTask = pdfjs.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  
  const numPages = pdf.numPages;
  console.log('PDF loaded, pages:', numPages);
  
  // Extract text from all pages
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= Math.min(numPages, 3); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ');
    
    fullText += `\n=== PAGE ${pageNum} ===\n${pageText}\n`;
  }

  console.log('\n=== RESULT (first 3 pages) ===');
  console.log(fullText.slice(0, 1000));
  console.log('\nTotal pages in PDF:', numPages);
  console.log('SUCCESS!');
}

testPdfJsLegacy().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
