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
  const logoWidth = aspectRatio === '16:9' ? 18 : 28;
  const logoHeight = aspectRatio === '16:9' ? 12 : 10; 
  const footerHeight = 5;

  popBlocks.forEach((block) => {
    if (!block.trim()) return;

    const lines = block.trim().split(/\n/);
    let titleLine = 'PROCEDIMENTO OPERACIONAL PADRÃO';
    let contentLines = lines;

    // Detect if first line looks like a title
    if (lines[0] && lines[0].length < 80 && !lines[0].startsWith('-')) {
      titleLine = lines[0].trim().toUpperCase();
      contentLines = lines.slice(1);
    }
    // Also remove empty lines at the start
    while (contentLines.length > 0 && !contentLines[0].trim()) {
      contentLines.shift();
    }

    let currentChunk = '';
    const chunks: string[] = [];
    const MAX_CHARS_PER_SLIDE = aspectRatio === '16:9' ? 600 : 750;

    contentLines.forEach((line) => {
      if (currentChunk.length + line.length > MAX_CHARS_PER_SLIDE && currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    });
    if (currentChunk) chunks.push(currentChunk);

    if (chunks.length === 0) chunks.push(''); // ensure at least 1 slide

    chunks.forEach((chunk, index) => {
      let currentElements: SlideElement[] = [];

      // 1. Logo WA Fort (Top Right)
      currentElements.push({
        id: generateId(),
        type: 'image',
        content: 'wafort_logo',
        x: 100 - paddingX - logoWidth,
        y: 5,
        width: logoWidth,
        height: logoHeight,
        imageFit: 'contain'
      });

      // 2. Company Name & Title (Top Left)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'WA FORT',
        x: paddingX,
        y: 6,
        width: 60,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 12 : 14,
        fontFamily: 'heading',
        color: '#2563EB', // Medium Blue Accent
        bold: true,
        align: 'left'
      });

      currentElements.push({
        id: generateId(),
        type: 'text',
        content: titleLine,
        x: paddingX,
        y: 10,
        width: 80,
        height: 10,
        fontSize: aspectRatio === '16:9' ? 24 : 28,
        fontFamily: 'heading',
        color: '#0F172A', // Dark Blue
        bold: true,
        align: 'left'
      });

      // 3. White Card with Shadow
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: paddingX,
        y: 22,
        width: 100 - (paddingX * 2),
        height: 100 - 22 - footerHeight - 4,
        color: '#ffffff',
        borderRadius: 16,
        dropShadow: true
      });

      // 4. Vertical Blue Accent Line inside the card
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: paddingX + 2,
        y: 26,
        width: 0.5,
        height: 100 - 22 - footerHeight - 12,
        color: '#2563EB',
        borderRadius: 2
      });

      // 5. Body Text Inside the Card
      const textContent = chunk.trim();
      const charCount = textContent.length;
      
      let baseSize = aspectRatio === '16:9' ? 18 : 22;
      if (charCount > 300) baseSize -= 2;
      if (charCount > 500) baseSize -= 4;
      
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: textContent,
        x: paddingX + 5,
        y: 26,
        width: 100 - (paddingX * 2) - 8,
        height: 100 - 22 - footerHeight - 12, 
        fontSize: baseSize,
        fontFamily: 'body',
        color: '#334155', // Slate 700 (dark gray) for high readability
        bold: false,
        align: 'left'
      });

      // 6. Footer Line
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: paddingX,
        y: 100 - footerHeight - 2,
        width: 100 - (paddingX * 2),
        height: 0.2,
        color: '#cbd5e1' // Slate 300
      });

      // 7. Footer Text (Left)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'Procedimentos Internos • Uso Confidencial',
        x: paddingX,
        y: 100 - footerHeight,
        width: 60,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 10 : 12,
        fontFamily: 'body',
        color: '#64748b', // Slate 500
        bold: false,
        align: 'left'
      });

      // 8. Pagination Text (Right)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: `${index + 1} / ${chunks.length}`,
        x: 100 - paddingX - 10,
        y: 100 - footerHeight,
        width: 10,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 10 : 12,
        fontFamily: 'body',
        color: '#64748b',
        bold: true,
        align: 'right'
      });

      // 9. Signature Block ONLY on the last slide
      if (index === chunks.length - 1) {
        currentElements.push({
          id: generateId(),
          type: 'shape',
          x: 100 - paddingX - 35,
          y: 100 - footerHeight - 14,
          width: 30,
          height: 0.3,
          color: '#0F172A'
        });

        currentElements.push({
          id: generateId(),
          type: 'text',
          content: 'Assinatura do Responsável',
          x: 100 - paddingX - 35,
          y: 100 - footerHeight - 13,
          width: 30,
          height: 4,
          fontSize: aspectRatio === '16:9' ? 12 : 14,
          fontFamily: 'body',
          color: '#0F172A',
          bold: true,
          align: 'center'
        });
      }

      slides.push({
        id: 'pop-' + generateId(),
        elements: currentElements,
        backgroundColor: '#F8FAFC' // Light Slate 50 background
      });
    });
  });

  return slides;
}
