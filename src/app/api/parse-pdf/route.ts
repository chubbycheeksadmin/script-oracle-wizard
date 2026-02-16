import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the PDF file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if it's a PDF
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Read the file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('[parse-pdf] Buffer size:', buffer.length);

    // Use pdf2json to extract text
    const result = await new Promise<{ text: string; pages: number }>((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, 1);
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          const pages = pdfData.Pages || [];
          let fullText = '';
          
          pages.forEach((page: any, idx: number) => {
            fullText += `\n=== PAGE ${idx + 1} ===\n`;
            
            // Extract text from page
            const texts: string[] = [];
            if (page.Texts) {
              page.Texts.forEach((textItem: any) => {
                if (textItem.R) {
                  textItem.R.forEach((r: any) => {
                    if (r.T) {
                      try {
                        texts.push(decodeURIComponent(r.T));
                      } catch {
                        texts.push(r.T);
                      }
                    }
                  });
                }
              });
            }
            fullText += texts.join(' ') + '\n';
          });
          
          resolve({ text: fullText.trim(), pages: pages.length });
        } catch (err) {
          reject(err);
        }
      });
      
      pdfParser.on('pdfParser_dataError', (err: any) => {
        reject(new Error(err.parserError || 'PDF parsing failed'));
      });
      
      pdfParser.parseBuffer(buffer);
    });

    console.log('[parse-pdf] Parsed successfully:', result.pages, 'pages');

    return NextResponse.json({
      success: true,
      text: result.text,
      pageCount: result.pages,
    });

  } catch (error) {
    console.error('[parse-pdf] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `PDF parsing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
