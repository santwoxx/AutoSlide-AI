/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlideItem } from './types';

export const INITIAL_SLIDES: SlideItem[] = [
  {
    id: 'slide-1',
    elements: [
      {
        id: 'el-t1',
        type: 'text',
        x: 10,
        y: 35,
        width: 80,
        height: 15,
        content: 'Automação de Slides Pro',
        fontSize: 54,
        fontFamily: 'heading',
        align: 'center',
        bold: true,
      },
      {
        id: 'el-s1',
        type: 'text',
        x: 15,
        y: 55,
        width: 70,
        height: 15,
        content: 'Agora no Modo Livre (Canva)! Arraste, redimensione e posicione textos, imagens e formas.',
        fontSize: 20,
        fontFamily: 'body',
        align: 'center',
      }
    ]
  },
  {
    id: 'slide-2',
    elements: [
      {
        id: 'el-t2',
        type: 'text',
        x: 8,
        y: 10,
        width: 84,
        height: 12,
        content: 'Total Liberdade de Criação',
        fontSize: 36,
        fontFamily: 'heading',
        align: 'left',
        bold: true,
      },
      {
        id: 'el-b2',
        type: 'text',
        x: 8,
        y: 30,
        width: 40,
        height: 50,
        content: '• Cada elemento é independente\n• Posicionamento X/Y absoluto\n• Geração de script Python exata\n• Suporte nativo ao PPTX',
        fontSize: 18,
        fontFamily: 'body',
        align: 'left',
      },
      {
        id: 'el-sh1',
        type: 'shape',
        x: 55,
        y: 30,
        width: 35,
        height: 45,
        color: 'card'
      },
      {
        id: 'el-sh-txt',
        type: 'text',
        x: 58,
        y: 45,
        width: 29,
        height: 20,
        content: 'Use a barra lateral para adicionar imagens e formas!',
        fontSize: 16,
        fontFamily: 'body',
        align: 'center',
        bold: true
      }
    ]
  }
];
