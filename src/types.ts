/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ElementType = 'text' | 'image' | 'shape';

export interface SlideElement {
  id: string;
  type: ElementType;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
  
  // Specific properties
  content?: string; // Text content or image ID
  fontSize?: number; // For text
  fontFamily?: string; // For text ('heading', 'body')
  color?: string; // For text or shape (hex or theme color ref)
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  
  imageFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  
  // Animations specific to this element
  transitionIn?: string;
  transitionOut?: string;
  animation?: string; // specific loop/image animation
}

export interface SlideItem {
  id: string;
  elements: SlideElement[];
  
  // Global slide overrides
  backgroundColor?: string;
  transitionIn?: string;
  transitionOut?: string;
  transitionDurationOverride?: number;
}

export interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string; // Base64 data for local preview & pptx integration
  size?: string;
}

export type ThemeId = 'royal_corporate' | 'minimal_light' | 'corporate_dark' | 'warm_editorial' | 'studio_tech' | 'neon_vibrant';

export interface SlideTheme {
  id: ThemeId;
  name: string;
  bg: string;          // Tailwind class
  color: string;       // Tailwind text class
  accent: string;      // Tailwind accent text class
  accentBg: string;    // Tailwind accent background class
  border: string;      // Tailwind border class
  fontHeading: string; // CSS Font-family class or inline style font
  fontBody: string;
  previewBg: string;   // Hex color
  previewText: string; // Hex color
  previewAccent: string;// Hex color
  pythonThemeColors: {
    bg: [number, number, number];
    text: [number, number, number];
    accent: [number, number, number];
    card: [number, number, number];
  };
}

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'flip';
