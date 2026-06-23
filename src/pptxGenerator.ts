/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pptxgen from 'pptxgenjs';
import { SlideItem, SlideTheme, UploadedImage } from './types';

// Helper to convert an RGB array [R, G, B] into a 6-char HEX string
function rgbToHex(rgb: [number, number, number]): string {
  return rgb
    .map((val) => {
      const hex = val.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('')
    .toUpperCase();
}

export async function exportToPowerpoint(
  slides: SlideItem[],
  theme: SlideTheme,
  uploadedImages: UploadedImage[],
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<void> {
  const pptx = new pptxgen();

  // Set layout based on aspect ratio
  if (aspectRatio === '16:9') {
    pptx.layout = 'LAYOUT_16x9';
  } else {
    pptx.defineLayout({ name: 'PORTRAIT_9X16', width: 5.625, height: 10 });
    pptx.layout = 'PORTRAIT_9X16';
  }

  const canvasWInches = aspectRatio === '16:9' ? 13.333 : 5.625;
  const canvasHInches = aspectRatio === '16:9' ? 7.5 : 10;

  const imageMap = new Map(uploadedImages.map((img) => [img.id, img.dataUrl]));

  const bgHex = rgbToHex(theme.pythonThemeColors.bg);
  const textHex = rgbToHex(theme.pythonThemeColors.text);
  const accentHex = rgbToHex(theme.pythonThemeColors.accent);
  const cardHex = rgbToHex(theme.pythonThemeColors.card);

  const fontTitle = theme.id === 'warm_editorial' ? 'Georgia' : 'Arial';
  const fontBody = theme.id === 'studio_tech' ? 'Courier New' : 'Arial';

  slides.forEach((slide, sIdx) => {
    const pSlide = pptx.addSlide();

    // 1. Solid Background
    pSlide.background = { fill: bgHex };

    // 2. Structural Accents Based on Theme Profile
    if (theme.id === 'studio_tech') {
      // Tech-grid dots or top/bottom border
      pSlide.addShape((pptx as any).shapes.RECTANGLE, {
        x: 0.2,
        y: 0.2,
        w: 12.933,
        h: 0.05,
        fill: { color: accentHex },
      });
      pSlide.addShape((pptx as any).shapes.RECTANGLE, {
        x: 0.2,
        y: 7.25,
        w: 12.933,
        h: 0.05,
        fill: { color: textHex },
      });
    } else if (theme.id === 'warm_editorial') {
      // Elegant minimal top division line
      pSlide.addShape((pptx as any).shapes.RECTANGLE, {
        x: 0.7,
        y: 0.5,
        w: 11.933,
        h: 0.03,
        fill: { color: accentHex },
      });
    } else if (theme.id === 'neon_vibrant') {
      // Vibrant radiant accent bar at the bottom
      pSlide.addShape((pptx as any).shapes.RECTANGLE, {
        x: 0,
        y: 7.4,
        w: 13.333,
        h: 0.1,
        fill: { color: accentHex },
      });
    }

    // 3. Layout Component Placements
    (slide.elements || []).forEach(el => {
      const xInches = (el.x / 100) * canvasWInches;
      const yInches = (el.y / 100) * canvasHInches;
      const wInches = (el.width / 100) * canvasWInches;
      const hInches = (el.height / 100) * canvasHInches;

      if (el.type === 'text') {
        const elColor = el.color === 'accent' ? accentHex : (el.color === 'card' ? '#FFFFFF' : textHex);
        pSlide.addText(el.content || '', {
          x: xInches,
          y: yInches,
          w: wInches,
          h: hInches,
          fontSize: el.fontSize ? (el.fontSize * 0.7) : 18, // scale down visually slightly for PPTX
          fontFace: el.fontFamily === 'heading' ? fontTitle : fontBody,
          color: elColor,
          bold: el.bold,
          align: el.align as any || 'left',
          valign: 'top',
        });
      } else if (el.type === 'shape') {
        const shpColor = el.color === 'card' ? cardHex : accentHex;
        pSlide.addShape((pptx as any).shapes.RECTANGLE, {
          x: xInches,
          y: yInches,
          w: wInches,
          h: hInches,
          fill: { color: shpColor },
        });
      } else if (el.type === 'image') {
        const imgData = el.content ? imageMap.get(el.content) : null;
        if (imgData) {
          pSlide.addImage({
            data: imgData,
            x: xInches,
            y: yInches,
            w: wInches,
            h: hInches,
            sizing: {
              type: el.imageFit === 'contain' ? 'contain' : 'cover',
              w: wInches,
              h: hInches
            }
          });
        } else {
          pSlide.addShape((pptx as any).shapes.RECTANGLE, {
            x: xInches,
            y: yInches,
            w: wInches,
            h: hInches,
            fill: { color: cardHex },
          });
          pSlide.addText('Mídia Ausente', {
            x: xInches,
            y: yInches + (hInches / 2) - 0.2,
            w: wInches,
            h: 0.5,
            fontSize: 12,
            fontFace: fontBody,
            color: textHex,
            align: 'center',
          });
        }
      }
    });
  });

  // Export PowerPoint presentation
  await pptx.writeFile({ fileName: 'apresentacao_automatizada.pptx' });
}
