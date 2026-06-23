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
 * Generates perfectly laid out slides from raw text POP documents
 */
export function parsePOPDocumentToSlides(text: string, aspectRatio: '16:9' | '9:16'): SlideItem[] {
  if (!text.trim()) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const slides: SlideItem[] = [];
  
  // Aspect ratio baseline limits
  const maxY = aspectRatio === '16:9' ? 85 : 88;
  const paddingX = aspectRatio === '16:9' ? 6 : 8;
  const titleFontSize = aspectRatio === '16:9' ? 36 : 42;
  const bodyFontSize = aspectRatio === '16:9' ? 22 : 28;
  const logoWidth = aspectRatio === '16:9' ? 12 : 20;
  const logoHeight = aspectRatio === '16:9' ? 12 : 12;

  let currentElements: SlideElement[] = [];
  let currentY = 15; // Start below the logo
  let slideIndex = 0;

  const pushNewSlide = () => {
    // Add Logo WA Fort to the slide
    currentElements.push({
      id: generateId(),
      type: 'image',
      content: 'wafort_logo', // We will inject this URL in the main app
      x: 100 - paddingX - logoWidth,
      y: 3,
      width: logoWidth,
      height: logoHeight,
      imageFit: 'contain'
    });

    slides.push({
      id: 'pop-' + generateId(),
      elements: currentElements,
      backgroundColor: '#ffffff'
    });
    currentElements = [];
    currentY = 15;
    slideIndex++;
  };

  lines.forEach((line) => {
    const isHeading = line.toUpperCase() === line && line.length < 50;
    const isMainTitle = slideIndex === 0 && currentY === 15;

    let textHeight = isHeading ? 8 : 10;
    // Estimate text height based on length (very rough)
    if (line.length > (aspectRatio === '16:9' ? 100 : 50)) {
      textHeight += Math.floor(line.length / (aspectRatio === '16:9' ? 100 : 50)) * 6;
    }

    if (currentY + textHeight > maxY) {
      pushNewSlide();
    }

    currentElements.push({
      id: generateId(),
      type: 'text',
      content: line,
      x: paddingX,
      y: currentY,
      width: 100 - (paddingX * 2),
      height: textHeight,
      fontSize: isHeading || isMainTitle ? titleFontSize : bodyFontSize,
      fontFamily: isHeading || isMainTitle ? 'heading' : 'body',
      color: isHeading || isMainTitle ? 'accent' : 'text',
      bold: isHeading || isMainTitle,
      align: 'left'
    });

    currentY += textHeight + 2;
  });

  // Add signature to the last slide
  if (currentY + 20 > maxY) {
    pushNewSlide();
  }

  currentElements.push({
    id: generateId(),
    type: 'shape',
    x: paddingX + 15,
    y: currentY + 8,
    width: 70 - (paddingX * 2),
    height: 0.5,
    color: 'accent' // Golden line
  });

  currentElements.push({
    id: generateId(),
    type: 'text',
    content: 'Assinatura do Responsável',
    x: paddingX + 15,
    y: currentY + 10,
    width: 70 - (paddingX * 2),
    height: 5,
    fontSize: 14,
    fontFamily: 'body',
    color: 'text',
    bold: true,
    align: 'center'
  });

  pushNewSlide(); // push the last slide

  return slides;
}
