// Test script to debug PDF parsing
const fs = require('fs');
const path = require('path');

const PDF_PATH = '/Users/henry/.openclaw/media/inbound/24f76dcd-2dba-44e3-bd32-8bb1134972e5.pdf';

async function testWithPdf2Json() {
  console.log('=== Testing with pdf2json ===');
  try {
    const PDFParser = require('pdf2json');
    const buffer = fs.readFileSync(PDF_PATH);
    
    console.log('Buffer size:', buffer.length);
    console.log('Buffer first 20 bytes:', buffer.slice(0, 20));
    
    const pdfParser = new PDFParser();
    
    const result = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        console.log('PDF data ready, pages:', pdfData.Pages?.length);
        resolve(pdfData);
      });
      
      pdfParser.on('pdfParser_dataError', (err) => {
        console.error('PDF parse error:', err);
        reject(new Error(err.parserError || 'PDF parsing failed'));
      });
      
      pdfParser.parseBuffer(buffer);
    });
    
    console.log('Success with pdf2json!');
    return result;
  } catch (err) {
    console.error('pdf2json failed:', err.message);
    throw err;
  }
}

async function testWithPdfJs() {
  console.log('\n=== Testing with pdfjs-dist ===');
  try {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    const buffer = fs.readFileSync(PDF_PATH);
    
    // Create a data URL from buffer
    const uint8Array = new Uint8Array(buffer);
    
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    console.log('PDF loaded with pdfjs-dist, pages:', pdf.numPages);
    
    // Extract text from first few pages
    let fullText = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n=== PAGE ${i} ===\n${pageText}\n`;
    }
    
    console.log('Text preview (first 500 chars):', fullText.slice(0, 500));
    console.log('Success with pdfjs-dist!');
    return { numPages: pdf.numPages, text: fullText };
  } catch (err) {
    console.error('pdfjs-dist failed:', err.message);
    throw err;
  }
}

async function main() {
  console.log('Testing PDF:', PDF_PATH);
  console.log('File exists:', fs.existsSync(PDF_PATH));
  console.log('File size:', fs.statSync(PDF_PATH).size, 'bytes');
  
  try {
    await testWithPdf2Json();
  } catch (e) {
    console.log('\npdf2json failed, trying pdfjs-dist...\n');
  }
  
  try {
    await testWithPdfJs();
  } catch (e) {
    console.error('Both parsers failed');
    process.exit(1);
  }
}

main();
