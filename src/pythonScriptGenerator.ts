/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlideItem, UploadedImage, SlideTheme } from './types';

export function generatePythonScript(
  slides: SlideItem[],
  theme: SlideTheme,
  uploadedImages: UploadedImage[]
): string {
  // Convert uploaded images to helper map
  const imageMap = new Map(uploadedImages.map((img) => [img.id, img]));

  // Safe string escaper for single quotes in python
  const cleanPyStr = (str: string | undefined): string => {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  };

  const [tBgR, tBgG, tBgB] = theme.pythonThemeColors.bg;
  const [tTxtR, tTxtG, tTxtB] = theme.pythonThemeColors.text;
  const [tAccR, tAccG, tAccB] = theme.pythonThemeColors.accent;
  const [tCrdR, tCrdG, tCrdB] = theme.pythonThemeColors.card;

  const fontTitleName = theme.id === 'warm_editorial' ? 'Georgia' : 'Arial';
  const fontBodyName = theme.id === 'studio_tech' ? 'Courier New' : 'Arial';

  let code = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Automação gerado por Automatizador de Slides.
Este script monta uma apresentação de slides profissional com layouts modernos usando a biblioteca 'python-pptx'.

Requisitos:
    pip install python-pptx

Modo de Uso:
    python gerar_slides.py
"""

import os
import base64
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# --- PALETA DE CORES (Tema: ${theme.name}) ---
COLOR_BG = RGBColor(${tBgR}, ${tBgG}, ${tBgB})
COLOR_TEXT = RGBColor(${tTxtR}, ${tTxtG}, ${tTxtB})
COLOR_ACCENT = RGBColor(${tAccR}, ${tAccG}, ${tAccB})
COLOR_CARD = RGBColor(${tCrdR}, ${tCrdG}, ${tCrdB})

FONT_TITLE = '${fontTitleName}'
FONT_BODY = '${fontBodyName}'

def create_deck():
    # Inicializa apresentação widescreen 16:9
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    # Vamos usar o layout embranquecido/vazio padrão para controle total dos elementos
    blank_layout = prs.slide_layouts[6]

    # --- DICIONÁRIO DE IMAGENS EMBUTIDAS (BASE64) ---
    # As imagens inseridas no editor web são salvas aqui em formato compacto 
    # para auto-suficiência completa do script python localmente!
    images_base64 = {
`;

  // Write base64 representations of only the images used in these slides to save script size
  const usedImageIds = new Set<string>();
  slides.forEach((s) => {
    (s.elements || []).forEach(el => {
      if (el.type === 'image' && el.content) usedImageIds.add(el.content);
    });
  });

  usedImageIds.forEach((id) => {
    const img = imageMap.get(id);
    if (img) {
      // Extract clean base64 data (strip data URL prefix)
      const commaIndex = img.dataUrl.indexOf(',');
      if (commaIndex !== -1) {
        const rawBase64 = img.dataUrl.substring(commaIndex + 1);
        // Truncate line-by-line in python or write single clean continuous string.
        // Single continuous block inside triple quotes is very pythonic and simple
        code += `        '${id}': """${rawBase64}""",\n`;
      }
    }
  });

  code += `    }

    # Salva as imagens temporárias decodificadas
    temp_files = []
    print("Decodificando imagens locais...")
    for img_id, b64_data in images_base64.items():
        try:
            filename = f"temp_image_{img_id}.png"
            with open(filename, "wb") as f:
                f.write(base64.b64decode(b64_data.strip()))
            temp_files.append(filename)
        except Exception as e:
            print(f"Erro ao salvar imagem {img_id}: {e}")

    # --- AJUDANTES DE MONTAGEM ---
    
    def apply_solid_background(slide, color):
        """Define a cor de fundo sólida do slide."""
        bg = slide.background
        fill = bg.fill
        fill.solid()
        fill.fore_color.rgb = color

    def add_card_shape(slide, left, top, width, height, fill_color, line_color=None):
        """Cria um retângulo decorativo de fundo / fundo de conteúdo."""
        shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
        if line_color:
            shape.line.color.rgb = line_color
        else:
            shape.line.fill.background() # Sem borda
        return shape

    def format_text_frame(tf):
        """Elimina as margens internas padrão de caixas de textos."""
        tf.word_wrap = True
        tf.margin_left = Inches(0.05)
        tf.margin_right = Inches(0.05)
        tf.margin_top = Inches(0.05)
        tf.margin_bottom = Inches(0.05)

    print("Montando slides da apresentação...")
`;

  // Process slides
  slides.forEach((slide, index) => {
    code += `\n    # --- SLIDE ${index + 1} ---
    slide = prs.slides.add_slide(blank_layout)
    apply_solid_background(slide, COLOR_BG)
`;

    // Visual slide decorator (drawn background accents based on theme)
    if (theme.id === 'studio_tech') {
      // Tech-grid dots or border
      code += `    # Borda decorativa de estúdio tecnológico
    add_card_shape(slide, Inches(0.2), Inches(0.2), Inches(12.933), Inches(0.05), COLOR_ACCENT)
    add_card_shape(slide, Inches(0.2), Inches(7.25), Inches(12.933), Inches(0.05), COLOR_TEXT)
`;
    } else if (theme.id === 'warm_editorial') {
      // Minimal elegant line separation
      code += `    # Linha divisória editorial
    add_card_shape(slide, Inches(0.7), Inches(0.5), Inches(11.933), Inches(0.03), COLOR_ACCENT)
`;
    } else if (theme.id === 'neon_vibrant') {
      // Radiant bottom accent
      code += `    # Borda neon brilhante
    add_card_shape(slide, Inches(0), Inches(7.4), Inches(13.333), Inches(0.1), COLOR_ACCENT)
`;
    }

    // 3. Layout Component Placements (Dynamic Canva Mode)
    (slide.elements || []).forEach((el, elIdx) => {
      const xInches = (el.x / 100) * 13.333;
      const yInches = (el.y / 100) * 7.5;
      const wInches = (el.width / 100) * 13.333;
      const hInches = (el.height / 100) * 7.5;

      if (el.type === 'text') {
        const elColor = el.color === 'accent' ? 'COLOR_ACCENT' : (el.color === 'card' ? 'RGBColor(255, 255, 255)' : 'COLOR_TEXT');
        const fontName = el.fontFamily === 'heading' ? 'FONT_TITLE' : 'FONT_BODY';
        const fontSizePt = el.fontSize ? (el.fontSize * 0.7) : 18;
        const alignVal = el.align === 'center' ? 'PP_ALIGN.CENTER' : (el.align === 'right' ? 'PP_ALIGN.RIGHT' : 'PP_ALIGN.LEFT');

        code += `    # Text Element
    tx_box_${elIdx} = slide.shapes.add_textbox(Inches(${xInches.toFixed(3)}), Inches(${yInches.toFixed(3)}), Inches(${wInches.toFixed(3)}), Inches(${hInches.toFixed(3)}))
    tf_${elIdx} = tx_box_${elIdx}.text_frame
    format_text_frame(tf_${elIdx})
    
    p_${elIdx} = tf_${elIdx}.paragraphs[0]
    p_${elIdx}.text = "${cleanPyStr(el.content || '')}"
    p_${elIdx}.font.name = ${fontName}
    p_${elIdx}.font.size = Pt(${fontSizePt.toFixed(1)})
    p_${elIdx}.font.color.rgb = ${elColor}
    p_${elIdx}.font.bold = ${el.bold ? 'True' : 'False'}
    p_${elIdx}.alignment = ${alignVal}
`;
      } else if (el.type === 'shape') {
        const shpColor = el.color === 'card' ? 'COLOR_CARD' : 'COLOR_ACCENT';
        code += `    # Shape Element
    add_card_shape(slide, Inches(${xInches.toFixed(3)}), Inches(${yInches.toFixed(3)}), Inches(${wInches.toFixed(3)}), Inches(${hInches.toFixed(3)}), ${shpColor})
`;
      } else if (el.type === 'image') {
        if (el.content && usedImageIds.has(el.content)) {
          code += `    # Image Element
    img_p_${elIdx} = f"temp_image_${el.content}.png"
    if os.path.exists(img_p_${elIdx}):
        slide.shapes.add_picture(img_p_${elIdx}, Inches(${xInches.toFixed(3)}), Inches(${yInches.toFixed(3)}), width=Inches(${wInches.toFixed(3)}), height=Inches(${hInches.toFixed(3)}))
    else:
        add_card_shape(slide, Inches(${xInches.toFixed(3)}), Inches(${yInches.toFixed(3)}), Inches(${wInches.toFixed(3)}), Inches(${hInches.toFixed(3)}), COLOR_CARD)
`;
        } else {
          code += `    # Placeholder Image Element
    add_card_shape(slide, Inches(${xInches.toFixed(3)}), Inches(${yInches.toFixed(3)}), Inches(${wInches.toFixed(3)}), Inches(${hInches.toFixed(3)}), COLOR_CARD)
    tx_p_${elIdx} = slide.shapes.add_textbox(Inches(${xInches.toFixed(3)}), Inches(${yInches.toFixed(3)}), Inches(${wInches.toFixed(3)}), Inches(${hInches.toFixed(3)}))
    tx_p_${elIdx}.text_frame.paragraphs[0].text = "Mídia Ausente"
    tx_p_${elIdx}.text_frame.paragraphs[0].font.color.rgb = COLOR_TEXT
    tx_p_${elIdx}.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
`;
        }
      }
    });
  });

  code += `
    # --- SALVAR O ARQUIVO FINAL ---
    out_filename = "apresentacao_automatizada.pptx"
    prs.save(out_filename)
    print(f"\\nSucesso! Apresentação salva como '{out_filename}'.")

    # Limpeza de arquivos temporários
    print("Limpando arquivos temporários decodificados...")
    for filename in temp_files:
        try:
            if os.path.exists(filename):
                os.remove(filename)
        except Exception as e:
            pass
            
    print("Processo finalizado!")

if __name__ == "__main__":
    create_deck()
`;

  return code;
}
