// Test exact pattern from route.ts
const fs = require('fs');
const PDF_PATH = '/Users/henry/.openclaw/media/inbound/24f76dcd-2dba-44e3-bd32-8bb1134972e5.pdf';

async function testExactPattern() {
  console.log('=== Testing exact route.ts pattern ===');
  
  // Read file as buffer (simulating what happens with file.arrayBuffer())
  const fileBuffer = fs.readFileSync(PDF_PATH);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  
  console.log('fileBuffer length:', fileBuffer.length);
  console.log('arrayBuffer byteLength:', arrayBuffer.byteLength);
  
  // This is the exact pattern from route.ts
  const buffer = Buffer.from(arrayBuffer);
  
  console.log('Converted buffer length:', buffer.length);
  console.log('First 20 bytes:', buffer.slice(0, 20));
  
  const PDFParser = require('pdf2json');
  const pdfParser = new PDFParser();
  
  const result = await new Promise((resolve, reject) => {
    let text = '';
    let pageCount = 0;
    
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      pageCount = pdfData.Pages?.length || 0;
      
      pdfData.Pages?.forEach((page, idx) => {
        text += `\n=== PAGE ${idx + 1} ===\n`;
        page.Texts?.forEach((textItem) => {
          if (textItem.R) {
            textItem.R.forEach((r) => {
              if (r.T) {
                try {
                  text += decodeURIComponent(r.T) + ' ';
                } catch {
                  text += r.T + ' ';
                }
              }
            });
          }
        });
        text += '\n';
      });
      
      resolve({ text: text.trim(), pages: pageCount });
    });
    
    pdfParser.on('pdfParser_dataError', (err) => {
      console.error('PDF parse error event:', err);
      reject(new Error(err.parserError || 'PDF parsing failed'));
    });
    
    pdfParser.parseBuffer(buffer);
  });
  
  console.log('\n=== RESULT ===');
  console.log('Pages:', result.pages);
  console.log('Text preview (first 800 chars):');
  console.log(result.text.slice(0, 800));
  
  return result;
}

testExactPattern().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
