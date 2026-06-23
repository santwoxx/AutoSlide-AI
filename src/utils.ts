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
  const logoWidth = aspectRatio === '16:9' ? 16 : 22;
  const logoHeight = aspectRatio === '16:9' ? 8 : 6; 

  popBlocks.forEach((block) => {
    if (!block.trim()) return;

    const lines = block.trim().split(/\n/);
    let titleLine = 'PROCEDIMENTO OPERACIONAL PADRÃO';
    let subtitleLine = 'DIRETRIZES CORPORATIVAS';
    let contentLines = lines;

    if (lines[0] && lines[0].length < 80 && !lines[0].startsWith('-')) {
      titleLine = lines[0].trim().toUpperCase();
      contentLines = lines.slice(1);
    }
    if (contentLines[0] && contentLines[0].length < 100 && !contentLines[0].trim().startsWith('1.') && !contentLines[0].trim().startsWith('•')) {
      subtitleLine = contentLines[0].trim();
      contentLines = contentLines.slice(1);
    }

    while (contentLines.length > 0 && !contentLines[0].trim()) {
      contentLines.shift();
    }

    let currentChunk = '';
    let currentVisualLines = 0;
    const chunks: string[] = [];
    const MAX_VISUAL_LINES = aspectRatio === '16:9' ? 12 : 16;
    const CHARS_PER_LINE = aspectRatio === '16:9' ? 75 : 55;
    const MAX_CHARS_PER_SLIDE = aspectRatio === '16:9' ? 700 : 850;

    contentLines.forEach((line) => {
      // Simulate sections with icons/numbers for a premium look
      let formattedLine = line;
      if (line.match(/^\d+\./)) {
        formattedLine = line; // Keep numbers
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        formattedLine = line; // Keep bullets
      }

      // Estimate how many visual lines this text will occupy
      // An empty line takes 1 visual line. A long line takes length / CHARS_PER_LINE.
      const estimatedLines = Math.max(1, Math.ceil(formattedLine.length / CHARS_PER_LINE));

      const willExceedLines = currentVisualLines + estimatedLines > MAX_VISUAL_LINES;
      const willExceedChars = currentChunk.length + formattedLine.length > MAX_CHARS_PER_SLIDE;

      if ((willExceedLines || willExceedChars) && currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = formattedLine;
        currentVisualLines = estimatedLines;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + formattedLine : formattedLine;
        currentVisualLines += estimatedLines;
      }
    });
    if (currentChunk) chunks.push(currentChunk);
    if (chunks.length === 0) chunks.push(''); 

    chunks.forEach((chunk, index) => {
      let currentElements: SlideElement[] = [];

      // 1. Top Decorative Gold Line (Minimalist)
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: paddingX,
        y: 0,
        width: 15,
        height: 0.8,
        color: '#D4A017' // Gold
      });

      // 2. Company Name (Top Left, Small, Gold)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'WA FORT',
        x: paddingX,
        y: 4,
        width: 30,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 12 : 14,
        fontFamily: 'heading',
        color: '#D4A017', // Gold
        bold: true,
        align: 'left'
      });

      // 3. Main Title (Dark Blue)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: titleLine,
        x: paddingX,
        y: 8,
        width: 100 - (paddingX * 2) - logoWidth - 2,
        height: 10,
        fontSize: aspectRatio === '16:9' ? 28 : 34,
        fontFamily: 'heading',
        color: '#0A2E73', // Dark Blue
        bold: true,
        align: 'left'
      });

      // 4. Subtitle (Vibrant Blue)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: subtitleLine,
        x: paddingX,
        y: 19,
        width: 100 - (paddingX * 2) - logoWidth - 2,
        height: 6,
        fontSize: aspectRatio === '16:9' ? 16 : 18,
        fontFamily: 'body',
        color: '#1D4ED8', // Vibrant Blue
        bold: true,
        align: 'left'
      });

      // 5. Logo (Top Right)
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

      // 6. Content Area Divider (Vibrant Blue, thin)
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: paddingX,
        y: 28,
        width: 100 - (paddingX * 2),
        height: 0.1,
        color: '#1D4ED8' // Vibrant Blue
      });

      // 7. Body Text (Main Content)
      const textContent = chunk.trim();
      const charCount = textContent.length;
      
      let baseSize = aspectRatio === '16:9' ? 20 : 24; 
      if (charCount > 300) baseSize -= 2;
      if (charCount > 500) baseSize -= 4; // Absolute minimum will be 16
      
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: textContent,
        x: paddingX,
        y: 31,
        width: 100 - (paddingX * 2),
        height: 58, 
        fontSize: baseSize,
        fontFamily: 'body',
        color: '#374151', // Dark Gray for perfect readability
        bold: false,
        align: 'left'
      });

      // 8. Footer Line (Light Gray)
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: paddingX,
        y: 93,
        width: 100 - (paddingX * 2),
        height: 0.1,
        color: '#E5E7EB'
      });

      // 9. Footer Text (Left)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'Confidencial • Uso Interno WA Fort',
        x: paddingX,
        y: 95,
        width: 50,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 10 : 12,
        fontFamily: 'body',
        color: '#9CA3AF',
        bold: false,
        align: 'left'
      });

      // 10. Pagination (Right)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: `${index + 1} / ${chunks.length}`,
        x: 100 - paddingX - 10,
        y: 95,
        width: 10,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 10 : 12,
        fontFamily: 'body',
        color: '#9CA3AF',
        bold: true,
        align: 'right'
      });

      // 11. Signature (Last Slide Only)
      if (index === chunks.length - 1) {
        currentElements.push({
          id: generateId(),
          type: 'shape',
          x: 100 - paddingX - 35,
          y: 90,
          width: 35,
          height: 0.2,
          color: '#0A2E73'
        });

        currentElements.push({
          id: generateId(),
          type: 'text',
          content: 'Assinatura do Responsável',
          x: 100 - paddingX - 35,
          y: 91,
          width: 35,
          height: 4,
          fontSize: aspectRatio === '16:9' ? 12 : 14,
          fontFamily: 'body',
          color: '#0A2E73',
          bold: true,
          align: 'center'
        });
      }

      slides.push({
        id: 'pop-' + generateId(),
        elements: currentElements,
        backgroundColor: '#FFFFFF' // Pure White background for maximum clarity
      });
    });
  });

  return slides;
}
