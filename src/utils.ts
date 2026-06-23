/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlideItem, SlideElement } from './types';

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean ID generation helper
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Rule-based document compiler (NO-AI)
 * Parses simple structured markdown/text format into full slides.
 * Separator is '---'
 */
export function parseDocumentToSlides(text: string): SlideItem[] {
  if (!text.trim()) return [];

  // Split slides by separator line '---'
  const sections = text.split(/---\s*\n|---\s*$/);
  const slides: SlideItem[] = [];

  sections.forEach((section) => {
    const rawLines = section.split('\n');
    const lines = rawLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    // Default configuration for parsed slide
    const slideId = 'parsed-' + generateId();
    const elements: any[] = [];

    // 1. Identify title (First heading or first line)
    let titleLineIndex = 0;
    const firstLine = lines[0];
    let title = '';

    if (firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '');
      titleLineIndex = 1;
    } else {
      title = firstLine;
      titleLineIndex = 1;
    }

    elements.push({
      id: generateId(),
      type: 'text',
      content: title,
      x: 5,
      y: 5,
      width: 90,
      height: 20,
      fontSize: 48,
      align: 'left',
      color: 'accent',
      bold: true
    });

    // Remaining lines after extracting title
    const remainingLines = lines.slice(titleLineIndex);
    
    let yOffset = 30;
    remainingLines.forEach((l) => {
        elements.push({
            id: generateId(),
            type: 'text',
            content: l.replace(/^[-*•]\s*/, ''),
            x: 10,
            y: yOffset,
            width: 80,
            height: 15,
            fontSize: 24,
            align: 'left',
            color: 'text',
            bold: false
        });
        yOffset += 15;
    });

    slides.push({
      id: slideId,
      elements: elements
    });
  });

  return slides;
}

/**
 * WA Fort POP specialized parser
 * Generates one perfectly laid out slide per POP document, preserving exact text structure.
 */export function parsePOPDocumentToSlides(text: string, aspectRatio: '16:9' | '9:16'): SlideItem[] {
  if (!text.trim()) return [];

  const popBlocks = text.split(/---\s*\n|---\s*$/);
  const slides: SlideItem[] = [];
  
  const paddingX = aspectRatio === '16:9' ? 6 : 8;
  const logoWidth = aspectRatio === '16:9' ? 25 : 45;
  const logoHeight = aspectRatio === '16:9' ? 18 : 16; 
  const headerHeight = aspectRatio === '16:9' ? 22 : 18;
  const footerHeight = aspectRatio === '16:9' ? 6 : 5;

  popBlocks.forEach((block) => {
    if (!block.trim()) return;

    const lines = block.trim().split(/\n/);
    let currentChunk = '';
    const chunks: string[] = [];
    const MAX_CHARS_PER_SLIDE = aspectRatio === '16:9' ? 500 : 700;

    lines.forEach((line) => {
      if (currentChunk.length + line.length > MAX_CHARS_PER_SLIDE && currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    });
    if (currentChunk) chunks.push(currentChunk);

    chunks.forEach((chunk, index) => {
      let currentElements: SlideElement[] = [];

      // 1. Top Vibrant Blue Bar
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: 0,
        y: 0,
        width: 100,
        height: headerHeight,
        color: '#1d4ed8' // Vibrant Royal Blue
      });

      // 2. Gold Line Under Header
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: 0,
        y: headerHeight,
        width: 100,
        height: 1.5,
        color: '#fbbf24' // Gold
      });

      // 3. Logo WA Fort (Centered in Header)
      currentElements.push({
        id: generateId(),
        type: 'image',
        content: 'wafort_logo',
        x: 100 - paddingX - logoWidth,
        y: (headerHeight - logoHeight) / 2,
        width: logoWidth,
        height: logoHeight,
        imageFit: 'contain'
      });

      // 4. Document Label in Header
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'WA FORT • PROCEDIMENTO PADRÃO',
        x: paddingX,
        y: (headerHeight / 2) - (aspectRatio === '16:9' ? 3 : 2),
        width: 60,
        height: 10,
        fontSize: aspectRatio === '16:9' ? 20 : 26,
        fontFamily: 'heading',
        color: '#ffffff',
        bold: true,
        align: 'left'
      });

      // 5. Body Text
      const textContent = chunk.trim();
      const charCount = textContent.length;
      
      let baseSize = aspectRatio === '16:9' ? 22 : 28;
      if (charCount > 300) baseSize -= 2;
      if (charCount > 500) baseSize -= 4;
      if (charCount > 700) baseSize -= 6;
      
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: textContent,
        x: paddingX,
        y: headerHeight + 6,
        width: 100 - (paddingX * 2),
        height: 100 - headerHeight - footerHeight - 12, 
        fontSize: baseSize,
        fontFamily: 'body',
        color: '#0f172a', // Very dark blue for text (almost black)
        bold: false,
        align: 'left'
      });

      // 6. Footer Gold Line
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: 0,
        y: 100 - footerHeight - 1.5,
        width: 100,
        height: 1.5,
        color: '#fbbf24'
      });

      // 7. Footer Blue Bar
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: 0,
        y: 100 - footerHeight,
        width: 100,
        height: footerHeight,
        color: '#1d4ed8'
      });

      // 8. Pagination Text in Footer
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: `Página ${index + 1} de ${chunks.length}`,
        x: paddingX,
        y: 100 - footerHeight + (aspectRatio === '16:9' ? 1.5 : 1),
        width: 50,
        height: 5,
        fontSize: aspectRatio === '16:9' ? 14 : 18,
        fontFamily: 'body',
        color: '#ffffff',
        bold: true,
        align: 'left'
      });

      // 9. Signature Block ONLY on the last slide
      if (index === chunks.length - 1) {
        currentElements.push({
          id: generateId(),
          type: 'shape',
          x: 100 - paddingX - 40,
          y: 100 - footerHeight - 10,
          width: 40,
          height: 0.5,
          color: '#1d4ed8'
        });

        currentElements.push({
          id: generateId(),
          type: 'text',
          content: 'Assinatura do Responsável',
          x: 100 - paddingX - 40,
          y: 100 - footerHeight - 8.5,
          width: 40,
          height: 5,
          fontSize: aspectRatio === '16:9' ? 14 : 18,
          fontFamily: 'body',
          color: '#1d4ed8',
          bold: true,
          align: 'center'
        });
      }

      slides.push({
        id: 'pop-' + generateId(),
        elements: currentElements,
        backgroundColor: '#ffffff' // Pure white background
      });
    });
  });

  return slides;
}
