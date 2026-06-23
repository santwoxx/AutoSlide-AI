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
  
  const paddingX = aspectRatio === '16:9' ? 5 : 6;
  const sidebarWidth = aspectRatio === '16:9' ? 25 : 30;
  const logoWidth = aspectRatio === '16:9' ? 18 : 28;
  const logoHeight = aspectRatio === '16:9' ? 10 : 8; 

  popBlocks.forEach((block) => {
    if (!block.trim()) return;

    const lines = block.trim().split(/\n/);
    let titleLine = 'PROCEDIMENTO OPERACIONAL PADRÃO';
    let subtitleLine = 'DIRETRIZES E INSTRUÇÕES';
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
    const chunks: string[] = [];
    // Adjust max chars to fit inside the 65% width card
    const MAX_CHARS_PER_SLIDE = aspectRatio === '16:9' ? 500 : 600;

    contentLines.forEach((line) => {
      if (currentChunk.length + line.length > MAX_CHARS_PER_SLIDE && currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    });
    if (currentChunk) chunks.push(currentChunk);
    if (chunks.length === 0) chunks.push(''); 

    chunks.forEach((chunk, index) => {
      let currentElements: SlideElement[] = [];

      // 1. Left Sidebar (Dark Blue)
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: 0,
        y: 0,
        width: sidebarWidth,
        height: 100,
        color: '#0A2E73' // Dark Blue
      });

      // 1.1 Sidebar Gold Line Detail
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: 5,
        y: 20,
        width: sidebarWidth - 10,
        height: 0.3,
        color: '#D4A017' // Gold
      });

      // 1.2 Sidebar Text (Objective)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'PADRONIZAÇÃO\nDE PROCESSOS',
        x: 5,
        y: 22,
        width: sidebarWidth - 10,
        height: 15,
        fontSize: aspectRatio === '16:9' ? 18 : 22,
        fontFamily: 'heading',
        color: '#FFFFFF',
        bold: true,
        align: 'left'
      });

      // 1.3 Sidebar Subtext
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'As diretrizes contidas neste documento visam assegurar a excelência e conformidade operacional da WA Fort.',
        x: 5,
        y: 35,
        width: sidebarWidth - 10,
        height: 30,
        fontSize: aspectRatio === '16:9' ? 12 : 14,
        fontFamily: 'body',
        color: '#F3F4F6', // Light gray
        bold: false,
        align: 'left'
      });

      // 1.4 Company Name in Gold (Bottom of Sidebar)
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: 'WA FORT',
        x: 5,
        y: 90,
        width: sidebarWidth - 10,
        height: 5,
        fontSize: aspectRatio === '16:9' ? 14 : 16,
        fontFamily: 'heading',
        color: '#D4A017', // Gold
        bold: true,
        align: 'left'
      });

      // 2. Header Area (Right side)
      // Title
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: titleLine,
        x: sidebarWidth + paddingX,
        y: 6,
        width: 100 - sidebarWidth - paddingX - logoWidth - 5,
        height: 10,
        fontSize: aspectRatio === '16:9' ? 26 : 30,
        fontFamily: 'heading',
        color: '#0A2E73', // Dark blue title
        bold: true,
        align: 'left'
      });

      // Subtitle
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: subtitleLine,
        x: sidebarWidth + paddingX,
        y: 16,
        width: 100 - sidebarWidth - paddingX - logoWidth - 5,
        height: 6,
        fontSize: aspectRatio === '16:9' ? 16 : 18,
        fontFamily: 'body',
        color: '#1D4ED8', // Vibrant blue subtitle
        bold: true,
        align: 'left'
      });

      // Logo
      currentElements.push({
        id: generateId(),
        type: 'image',
        content: 'wafort_logo',
        x: 100 - paddingX - logoWidth,
        y: 6,
        width: logoWidth,
        height: logoHeight,
        imageFit: 'contain'
      });

      // 3. Main White Card
      const cardY = 25;
      const cardHeight = 65;
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: sidebarWidth + paddingX,
        y: cardY,
        width: 100 - sidebarWidth - (paddingX * 2),
        height: cardHeight,
        color: '#FFFFFF', // White
        borderRadius: 16,
        dropShadow: true
      });

      // 4. Body Text Inside Card
      const textContent = chunk.trim();
      const charCount = textContent.length;
      
      let baseSize = aspectRatio === '16:9' ? 18 : 22; // Must not be < 16
      if (charCount > 300) baseSize -= 1;
      if (charCount > 500) baseSize -= 2;
      
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: textContent,
        x: sidebarWidth + paddingX + 4,
        y: cardY + 5,
        width: 100 - sidebarWidth - (paddingX * 2) - 8,
        height: cardHeight - 10, 
        fontSize: baseSize,
        fontFamily: 'body',
        color: '#374151', // Dark gray for text
        bold: false,
        align: 'left'
      });

      // 5. Footer Line
      currentElements.push({
        id: generateId(),
        type: 'shape',
        x: sidebarWidth + paddingX,
        y: 95,
        width: 100 - sidebarWidth - (paddingX * 2),
        height: 0.2,
        color: '#E5E7EB' // Very light gray divider
      });

      // 6. Pagination
      currentElements.push({
        id: generateId(),
        type: 'text',
        content: `Página ${index + 1} de ${chunks.length}`,
        x: 100 - paddingX - 20,
        y: 96,
        width: 20,
        height: 4,
        fontSize: aspectRatio === '16:9' ? 12 : 14,
        fontFamily: 'body',
        color: '#9CA3AF',
        bold: false,
        align: 'right'
      });

      // 7. Signature (Last Slide Only)
      if (index === chunks.length - 1) {
        currentElements.push({
          id: generateId(),
          type: 'shape',
          x: 100 - paddingX - 35,
          y: cardY + cardHeight + 4,
          width: 30,
          height: 0.3,
          color: '#0A2E73'
        });

        currentElements.push({
          id: generateId(),
          type: 'text',
          content: 'Assinatura do Responsável',
          x: 100 - paddingX - 35,
          y: cardY + cardHeight + 4.5,
          width: 30,
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
        backgroundColor: '#F8FAFC' // Very light gray background
      });
    });
  });

  return slides;
}
