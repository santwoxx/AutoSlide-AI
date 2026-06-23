/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Edit3,
  Image as ImageIcon,
  FileText,
  Palette,
  Play,
  Briefcase,
  Download,
  Copy,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  Code,
  Sparkles,
  FolderOpen,
  CheckCircle,
  FileDown,
  FileCode,
  Columns,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  ImageDown,
  Zap,
  RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { AnimatePresence, motion } from 'motion/react';
import { SlideItem, UploadedImage, ThemeId, TransitionType, AspectRatio } from './types';
import { THEMES } from './themes';
import { INITIAL_SLIDES } from './initialData';
import { parseDocumentToSlides, formatBytes, generateId, parsePOPDocumentToSlides } from './utils';
import { generatePythonScript } from './pythonScriptGenerator';
import { exportToPowerpoint } from './pptxGenerator';

export default function App() {
  // Core State
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const [slides, setSlides] = useState<SlideItem[]>(INITIAL_SLIDES);
  const [activeSlideId, setActiveSlideId] = useState<string>(INITIAL_SLIDES[0].id);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('royal_corporate');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [activeTab, setActiveTab] = useState<'slides' | 'editor' | 'pop' | 'images' | 'theme'>('slides');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [draggingNode, setDraggingNode] = useState<{ id: string, startX: number, startY: number, startElX: number, startElY: number } | null>(null);
  const [resizingNode, setResizingNode] = useState<{ id: string, startX: number, startY: number, startWidth: number, startHeight: number, direction: 'r' | 'b' | 'br' } | null>(null);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Active theme configuration helper
  const currentTheme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];
  const activeSlideIndex = slides.findIndex((s) => s.id === activeSlideId);
  const activeSlide = slides[activeSlideIndex] || slides[0];
  
  // Slide Show Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [transition, setTransition] = useState<TransitionType>('slide');
  const [autoplaySpeed, setAutoplaySpeed] = useState<number>(4); // seconds
  const [playDirection, setPlayDirection] = useState<number>(1); // 1 = next, -1 = prev
  const [globalTransitionDuration, setGlobalTransitionDuration] = useState<number>(0.4);
  const [globalImageAnimation, setGlobalImageAnimation] = useState<string>('zoom-in');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Synchronize state with browser-level fullscreen if possible
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 450 });

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
        }
      }
    });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [isFullscreen, activeTab]); // Re-bind if DOM changes structure

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard Navigation & Escape for Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing slide navigation if user is inside form inputs or textareas
      const activeEl = document.activeElement?.tagName;
      if (
        activeEl === 'INPUT' || 
        activeEl === 'TEXTAREA' || 
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        addLog('Tela cheia desativada via tecla Esc.');
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        triggerNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerPrevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, slides, activeSlideIndex]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      addLog('Modo tela cheia ativado.');
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {
          addLog('Usando overlay nativo de tela cheia por restrições do iframe.');
        });
      }
    } else {
      setIsFullscreen(false);
      addLog('Modo tela cheia desativado.');
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Code Block State
  const [copied, setCopied] = useState(false);
  
  // Batch Input Text
  const [batchText, setBatchText] = useState<string>(
    `# Meu Lançamento de Produto\nApresentação de Estratégias Comerciais\n---\n# Pilares de Crescimento\n- Excelência em design de interface\n- Velocidade máxima no carregamento\n- Automações sem fricção de rede\n- Processamento local e seguro de dados\n---\n# Redução de Desperdício\n85%\nEconomia operacional em design\nEstabilidade sistêmica garantida por algoritmos deterministas sem dependências adicionais.\n---\n# Visão do Fundador\n"A simplicidade de código gera os ativos mais valiosos, seguros e autônomos que uma operação corporativa pode possuir."\n— Steve Jobs adaptado, Co-Fundador\n---\n# Próximos Passos\n- Validar o script python-pptx na máquina\n- Testar novas diretrizes de cores e fontes\n- Customizar arquivos conforme demanda`
  );

  // Custom Sleek Interface States
  const [fitImages, setFitImages] = useState(true);
  const [extractExif, setExtractExif] = useState(false);
  const [speakerNotes, setSpeakerNotes] = useState(true);
  const [bottomView, setBottomView] = useState<'console' | 'python'>('console');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '// python-pptx rendering engine active...',
    '> init_slide_builder --theme=sleek_interface --auto-save=true',
    '[SUCCESS] Loaded presentation workspace with 5 default slides.',
    '[INFO] Ready for slides compilation and PowerPoint export.'
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    setTerminalLogs((prev) => [...prev.slice(-15), `[${time}] ${msg}`]);
  };

  // Auto-play timer effect
  useEffect(() => {
    let autoplayTimer: NodeJS.Timeout;
    if (isPlaying && slides.length > 1) {
      autoplayTimer = setInterval(() => {
        setPlayDirection(1);
        setActiveSlideId((prevId) => {
          const currentIdx = slides.findIndex((s) => s.id === prevId);
          const nextIdx = (currentIdx + 1) % slides.length;
          return slides[nextIdx].id;
        });
      }, autoplaySpeed * 1000);
    }
    return () => clearInterval(autoplayTimer);
  }, [isPlaying, slides, autoplaySpeed]);

  // Display helpful toaster notifications
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // ----------------------------------------------------
  // Slide Modification Actions
  // ----------------------------------------------------
  const addSlide = () => {
    const newId = 'slide-' + generateId();
    const newSlide: SlideItem = {
      id: newId,
      elements: [],
    };

    setSlides([...slides, newSlide]);
    setActiveSlideId(newId);
    setActiveTab('editor'); // Auto show editor
    showToast(`Slide em branco adicionado!`);
    addLog(`[SUCCESS] Adicionado novo slide livre.`);
    addLog(`[INFO] Workspace composto por ${slides.length + 1} slides ativos.`);
  };

  const deleteSlide = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (slides.length <= 1) {
      showToast('A apresentação precisa conter ao menos 1 slide.');
      return;
    }
    const idx = slides.findIndex((s) => s.id === id);
    const updated = slides.filter((s) => s.id !== id);
    setSlides(updated);
    
    // Manage active slide focus
    if (activeSlideId === id) {
      const nextActiveIdx = Math.max(0, idx - 1);
      setActiveSlideId(updated[nextActiveIdx].id);
    }
    showToast('Slide removido da lista.');
    addLog(`[WARN] Removido slide ID: "${id}".`);
    addLog(`[INFO] Workspace composto por ${updated.length} slides ativos.`);
  };

  const duplicateSlide = (slide: SlideItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = 'slide-' + generateId();
    const copy: SlideItem = {
      ...slide,
      id: newId,
      // Create deep clone of elements
      elements: slide.elements.map((el) => ({ ...el, id: 'el-' + generateId() })),
    };
    
    const idx = slides.findIndex((s) => s.id === slide.id);
    const updated = [...slides];
    updated.splice(idx + 1, 0, copy);
    
    setSlides(updated);
    setActiveSlideId(newId);
    showToast('Slide duplicado com sucesso!');
    addLog(`[SUCCESS] Slide ID "${slide.id}" duplicado em novo slot.`);
  };

  const moveSlide = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...slides];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    
    setSlides(updated);
    showToast('Ordem dos slides reorganizada.');
    addLog(`[INFO] Slide reordenado da posição ${index + 1} para ${targetIdx + 1}.`);
  };

  // ----------------------------------------------------
  // Update Specific Slide & Elements Property
  // ----------------------------------------------------
  const updateSlideProp = (key: keyof SlideItem, value: any) => {
    setSlides(
      slides.map((s) => {
        if (s.id === activeSlideId) {
          return { ...s, [key]: value };
        }
        return s;
      })
    );
  };

  const addElement = (type: 'text' | 'image' | 'shape') => {
    const el: any = {
      id: 'el-' + generateId(),
      type,
      x: 20,
      y: 20,
      width: 40,
      height: 20,
    };
    if (type === 'text') {
      el.content = 'Novo Texto';
      el.fontSize = 24;
      el.fontFamily = 'body';
      el.color = 'text';
      el.align = 'left';
    } else if (type === 'shape') {
      el.color = 'card';
    }
    
    setSlides(slides.map(s => {
      if (s.id === activeSlideId) {
        return { ...s, elements: [...s.elements, el] };
      }
      return s;
    }));
    setSelectedElementId(el.id);
    addLog(`[SUCCESS] Adicionado elemento ${type}.`);
  };

  const updateElement = (id: string, updates: any) => {
    setSlides(slides.map(s => {
      if (s.id === activeSlideId) {
        return { ...s, elements: s.elements.map(el => el.id === id ? { ...el, ...updates } : el) };
      }
      return s;
    }));
  };

  const deleteElement = (id: string) => {
    setSlides(slides.map(s => {
      if (s.id === activeSlideId) {
        return { ...s, elements: s.elements.filter(el => el.id !== id) };
      }
      return s;
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // ----------------------------------------------------
  // Image Upload Mechanics
  // ----------------------------------------------------
  const handleImageFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process multiple loaded images
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newImg: UploadedImage = {
            id: 'img-' + generateId(),
            name: file.name,
            dataUrl: dataUrl,
            size: formatBytes(file.size),
          };
          setUploadedImages((prev) => [...prev, newImg]);
          showToast(`Imagem "${file.name}" carregada com sucesso!`);
          addLog(`[SUCCESS] Nova imagem embutida de mídia: "${file.name}" (${formatBytes(file.size)}).`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (imgId: string) => {
    setUploadedImages((prev) => prev.filter((im) => im.id !== imgId));
    // Clean deleted image associations on slide
    setSlides(
      slides.map((s) => {
        const cl = { ...s };
        if (cl.image1Id === imgId) cl.image1Id = undefined;
        if (cl.image2Id === imgId) cl.image2Id = undefined;
        return cl;
      })
    );
    showToast('Imagem removida do repositório local.');
    addLog(`[WARN] Mídia ID "${imgId}" desmarcada e removida do workspace.`);
    addLog('[SUCCESS] Apresentação gerada via Batch Processor.');
  };

  const runPOPCompile = () => {
    if (!batchText.trim()) {
      showToast('Insira o texto do POP para gerar.');
      return;
    }

    const hasLogo = uploadedImages.some(img => img.id === 'wafort_logo');
    if (!hasLogo) {
      setUploadedImages(prev => [...prev, {
        id: 'wafort_logo',
        name: 'Logo WA Fort',
        dataUrl: 'https://i.ibb.co/C32GVNqh/logo.webp'
      }]);
    }

    const generated = parsePOPDocumentToSlides(batchText, aspectRatio);
    setSlides(generated);
    setActiveTab('slides');
    setSelectedThemeId('royal_corporate'); // Garante que seja num tema corporativo azul/branco
    showToast(`POP WA Fort gerado! (${generated.length} slides)`);
    addLog('[SUCCESS] Procedimento Operacional WA Fort gerado via Inteligência POP.');
  };

  const exportCurrentSlideAsImage = async () => {
    if (!canvasRef.current) return;
    
    try {
      // Temporarily hide selection handles and outlines before capturing
      const previousSelected = selectedElementId;
      setSelectedElementId(null);
      setEditingElementId(null);
      
      // Wait a tiny bit for React to re-render without selections
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
        backgroundColor: null // transparent
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Procedimento_WAFort_Slide_${slides.findIndex(s => s.id === activeSlideId) + 1}.png`;
      link.click();
      
      // Restore selection
      setSelectedElementId(previousSelected);
      
      showToast('Imagem PNG baixada com sucesso!');
      addLog('[SUCCESS] Slide exportado como PNG.');
    } catch (err) {
      showToast('Erro ao gerar imagem.');
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // Document Paste Auto-Compilation
  // ----------------------------------------------------
  const runBatchCompile = () => {
    try {
      addLog('[PROCESS] Analisando estrutura textual no input Markdown...');
      const parsed = parseDocumentToSlides(batchText);
      if (parsed.length === 0) {
        showToast('Nenhum slide detectado. Verifique a formatação do texto.');
        addLog('[ERROR] Varredura Markdown rejeitada: nenhum bloco delimitado com "---" encontrado.');
        return;
      }
      setSlides(parsed);
      setActiveSlideId(parsed[0].id);
      setActiveTab('slides');
      showToast(`Sucesso! ${parsed.length} slides automáticos montados em lote.`);
      addLog(`[SUCCESS] Interpretadas estaticamente ${parsed.length} seções Markdown.`);
      addLog('[INFO] Recompilação automática de herança de layouts concluída.');
    } catch (err: any) {
      showToast('Erro ao processar as linhas do documento: ' + err.message);
      addLog(`[ERROR] Falha de compilação: ${err.message}.`);
    }
  };

  // ----------------------------------------------------
  // Code Copy / Download Controls
  // ----------------------------------------------------
  const compiledPythonCode = generatePythonScript(slides, currentTheme, uploadedImages, aspectRatio);

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(compiledPythonCode);
    setCopied(true);
    showToast('Código Python copiado para a Área de Transferência!');
    addLog('[INFO] Copiado bloco de script python-pptx gerado para Clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPythonScript = () => {
    const blob = new Blob([compiledPythonCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gerar_slides.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Script "gerar_slides.py" baixado com sucesso!');
    addLog('[SUCCESS] Script autônomo "gerar_slides.py" empacotado e enviado.');
  };

  const downloadPptxFile = async () => {
    try {
      showToast('Iniciando compilação do arquivo .pptx...');
      addLog('[PROCESS] Gerando representações binárias dos slides em formato PPTX...');
      await exportToPowerpoint(slides, currentTheme, uploadedImages, aspectRatio);
      showToast('Apresentação .pptx baixada com sucesso!');
      addLog('[SUCCESS] Compilação PowerPoint (.pptx) fechada e transferida.');
    } catch (err) {
      showToast('Instabilidade ao exportar PPTX: ' + err);
      addLog(`[ERROR] Instabilidade na renderização pptx: ${err}.`);
    }
  };

  // ----------------------------------------------------
  // PowerPoint Viewer Transition Animations
  // ----------------------------------------------------
  const getTransitionVariant = (slide?: SlideItem) => {
    // Resolve dynamic animation speed
    const duration = slide?.transitionDurationOverride !== undefined 
      ? slide.transitionDurationOverride 
      : globalTransitionDuration;

    // Resolve entrance animation
    let initial: any = { opacity: 0 };
    let animate: any = { opacity: 1 };
    let transitionConfig: any = { duration };

    const trIn = slide?.transitionIn || 'default';
    
    if (trIn === 'default') {
      // Use global transition state
      switch (transition) {
        case 'fade':
          initial = { opacity: 0 };
          animate = { opacity: 1 };
          transitionConfig = { duration };
          break;
        case 'zoom':
          initial = { opacity: 0, scale: 0.9 };
          animate = { opacity: 1, scale: 1 };
          transitionConfig = { duration, ease: 'easeOut' };
          break;
        case 'flip':
          initial = { opacity: 0, rotateY: playDirection * 45 };
          animate = { opacity: 1, rotateY: 0 };
          transitionConfig = { duration, ease: 'easeInOut' };
          break;
        case 'slide':
        default:
          initial = { opacity: 0, x: playDirection * 250 };
          animate = { opacity: 1, x: 0 };
          transitionConfig = { duration, ease: [0.16, 1, 0.3, 1] };
          break;
      }
    } else {
      // Use slide-specific custom entering effect
      switch (trIn) {
        case 'slide-in-left':
          initial = { opacity: 0, x: -250 };
          animate = { opacity: 1, x: 0 };
          transitionConfig = { duration, ease: 'easeOut' };
          break;
        case 'slide-in-right':
          initial = { opacity: 0, x: 250 };
          animate = { opacity: 1, x: 0 };
          transitionConfig = { duration, ease: 'easeOut' };
          break;
        case 'slide-in-up':
          initial = { opacity: 0, y: 250 };
          animate = { opacity: 1, y: 0 };
          transitionConfig = { duration, ease: 'easeOut' };
          break;
        case 'slide-in-down':
          initial = { opacity: 0, y: -250 };
          animate = { opacity: 1, y: 0 };
          transitionConfig = { duration, ease: 'easeOut' };
          break;
        case 'fade-in':
          initial = { opacity: 0 };
          animate = { opacity: 1 };
          transitionConfig = { duration };
          break;
        case 'zoom-in':
          initial = { opacity: 0, scale: 0.85 };
          animate = { opacity: 1, scale: 1 };
          transitionConfig = { duration, ease: 'easeOut' };
          break;
        case 'flip-in':
          initial = { opacity: 0, rotateY: 45 };
          animate = { opacity: 1, rotateY: 0 };
          transitionConfig = { duration, ease: 'easeInOut' };
          break;
      }
    }

    // Resolve exit animation
    let exit: any = { opacity: 0 };
    const trOut = slide?.transitionOut || 'default';

    if (trOut === 'default') {
      // Use global transition state
      switch (transition) {
        case 'fade':
          exit = { opacity: 0 };
          break;
        case 'zoom':
          exit = { opacity: 0, scale: 1.1 };
          break;
        case 'flip':
          exit = { opacity: 0, rotateY: playDirection * -45 };
          break;
        case 'slide':
        default:
          exit = { opacity: 0, x: playDirection * -250 };
          break;
      }
    } else {
      // Use slide-specific custom exit effect
      switch (trOut) {
        case 'slide-out-left':
          exit = { opacity: 0, x: -250 };
          break;
        case 'slide-out-right':
          exit = { opacity: 0, x: 250 };
          break;
        case 'slide-out-up':
          exit = { opacity: 0, y: -250 };
          break;
        case 'slide-out-down':
          exit = { opacity: 0, y: 250 };
          break;
        case 'fade-out':
          exit = { opacity: 0 };
          break;
        case 'zoom-out':
          exit = { opacity: 0, scale: 0.85 };
          break;
        case 'flip-out':
          exit = { opacity: 0, rotateY: -45 };
          break;
      }
    }

    return {
      initial,
      animate: { ...animate, transition: transitionConfig },
      exit: { ...exit, transition: transitionConfig }
    };
  };

  const getImageAnimationProps = (animType: string, duration: number) => {
    switch (animType) {
      case 'zoom-in':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration, ease: 'easeOut' }
        };
      case 'slide-up':
        return {
          initial: { opacity: 0, y: 40 },
          animate: { opacity: 1, y: 0 },
          transition: { duration, ease: 'easeOut' }
        };
      case 'bounce':
        return {
          initial: { opacity: 0, scale: 0.5 },
          animate: { opacity: 1, scale: 1 },
          transition: { type: 'spring', damping: 12, stiffness: 100 }
        };
      case 'rotate':
        return {
          initial: { opacity: 0, rotate: -10, scale: 0.9 },
          animate: { opacity: 1, rotate: 0, scale: 1 },
          transition: { duration, ease: 'easeOut' }
        };
      case 'pulse':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { 
            opacity: 1,
            scale: [0.95, 1.03, 0.95],
          },
          transition: {
            opacity: { duration: 0.3 },
            scale: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
          }
        };
      case 'float':
        return {
          initial: { opacity: 0, y: 15 },
          animate: { 
            opacity: 1,
            y: [15, -6, 15],
          },
          transition: {
            opacity: { duration: 0.3 },
            y: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
          }
        };
      case 'ken-burns':
        return {
          initial: { opacity: 0, scale: 1 },
          animate: { 
            opacity: 1,
            scale: [1, 1.08, 1],
          },
          transition: {
            opacity: { duration: 0.4 },
            scale: { duration: 8, ease: 'linear', repeat: Infinity }
          }
        };
      case 'none':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration }
        };
    }
  };

  function triggerNextSlide() {
    setPlayDirection(1);
    const nextIdx = (activeSlideIndex + 1) % slides.length;
    setActiveSlideId(slides[nextIdx].id);
  }

  function triggerPrevSlide() {
    setPlayDirection(-1);
    const prevIdx = (activeSlideIndex - 1 + slides.length) % slides.length;
    setActiveSlideId(slides[prevIdx].id);
  }

  // Reference for quick batch pre-fills
  const insertMockMarkdownExample = () => {
    const wafortMock = `POP - Procedimento Operacional Padrão.

Triagem de Atendimentos
Objetivo
Padronizar o processo de triagem de atendimentos realizados pela portaria, garantindo qualidade no atendimento e cumprimento do fluxo operacional.
Procedimento Operacional Padrão
Peço atenção quanto ao padrão de atendimento, seguindo o fluxo abaixo:
1. Tentativas de contato via interfone
•	Realizar 03 tentativas de contato para o interfone da unidade;
•	Aguardar tempo adequado entre as chamadas para possibilitar o atendimento do morador.
2. Tentativas de contato via telefone pessoal
•	Caso não obtenha retorno pelo interfone, realizar 02 tentativas de contato para o telefone pessoal cadastrado.
3. Retorno ao entregador/visitante
•	Não havendo sucesso nas tentativas de contato, retornar ao entregador ou visitante informando a impossibilidade de contato com o morador.
4. Envio de mensagem corporativa
•	Enviar mensagem através do James (Whatsapp Corporativo), registrando a tentativa de contato e informando a situação ao morador.
Observações
•	Todas as tentativas devem ser realizadas com cordialidade e clareza nas informações;
•	Seguir sempre as orientações e observações cadastradas para cada unidade;
•	Manter atenção ao correto registro das informações durante o atendimento.
Responsabilidade
Todos os operadores e colaboradores responsáveis pela triagem de atendimentos.`;
    setBatchText(wafortMock);
    addLog('Texto de exemplo POP carregado.');
  };

  if (isAppLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <img src="https://i.ibb.co/C32GVNqh/logo.webp" alt="WA Fort Logo" className="h-24 object-contain drop-shadow-lg" />
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-sm"></div>
            <p className="text-xs font-bold text-slate-500 font-mono tracking-widest uppercase animate-pulse">Carregando sistema...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white bg-slate-50 text-slate-900">
      {/* Toast Notification banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-950 to-indigo-950 border border-amber-450 text-white sm:text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-amber-400 fill-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation / Header */}
      <header className="h-16 border-b-2 border-amber-500/25 bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 flex items-center justify-between px-3 sm:px-6 shrink-0 z-20 shadow-md shadow-blue-950/15">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-500 shrink-0">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
              AutoSlide <span className="hidden sm:inline-block text-amber-450 bg-amber-500/10 border border-amber-500/40 text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold tracking-widest">v2.4.0 PRO</span>
            </h1>
            <p className="text-[9px] text-blue-200/60 hidden sm:block font-bold font-mono tracking-widest uppercase">PPTX & PYTHON COMPILER STAGE</p>
          </div>
        </div>

        {/* Global Action suite & Status Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="px-3.5 py-1 bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/30 rounded-full font-mono font-bold uppercase tracking-wider hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-amber-450 rounded-full animate-ping" />
            Motor PPTX Conectado
          </div>
          <button
            onClick={toggleFullscreen}
            title="Apresentar em Tela Cheia no próprio navegador"
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 shadow-md shadow-emerald-950/20 rounded-lg border border-emerald-500 hover:scale-[1.01] transition-all duration-150 cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="hidden sm:inline">Apresentar</span>
          </button>
          <button
            onClick={downloadPptxFile}
            title="Download PowerPoint: Exporta a apresentação pronta para abrir e editar no Microsoft PowerPoint."
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 shadow-md shadow-blue-950/20 rounded-lg border border-blue-500 hover:scale-[1.01] transition-all duration-150 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Gerar PowerPoint (.pptx)</span>
            <span className="sm:hidden">PPTX</span>
          </button>
          <button
            onClick={exportCurrentSlideAsImage}
            title="Download Imagem: Baixa a tela atual exatamente como aparece, em formato PNG."
            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 active:bg-white/20 text-emerald-300 hover:text-emerald-400 text-xs sm:text-sm font-bold py-2 px-2.5 sm:px-4 rounded-lg border border-white/20 transition duration-150 cursor-pointer shrink-0"
          >
            <ImageDown className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Imagem (PNG)</span>
            <span className="sm:hidden">PNG</span>
          </button>
          <button
            onClick={downloadPythonScript}
            title="Para Programadores e Integrações: Baixa o código de automação em Python (python-pptx) que recria a exata mesma apresentação no seu backend."
            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 active:bg-white/20 text-blue-100 hover:text-white text-xs sm:text-sm font-bold py-2 px-2.5 sm:px-4 rounded-lg border border-white/20 transition duration-150 cursor-pointer shrink-0"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="hidden xl:inline">Gerar Código (.py)</span>
            <span className="xl:hidden">Script</span>
          </button>
        </div>
      </header>

      {/* Main App Workspace Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Sub-Header Toggle Tab */}
        <div className="md:hidden flex bg-slate-100 border-b border-slate-200 p-2.5 shrink-0 justify-around select-none">
          <button
            onClick={() => {
              setMobileView('editor');
              addLog('Mudou para visualização do painel editor no celular.');
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileView === 'editor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200/50:bg-slate-800/30'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Painel Editor</span>
          </button>
          <button
            onClick={() => {
              setMobileView('preview');
              addLog('Mudou para visualização de slides no celular.');
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileView === 'preview'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-650 hover:bg-slate-200/50:bg-slate-800/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Slide Preview</span>
          </button>
        </div>

        {/* Left Side: Sidebar Control & Setup Panels */}
        <aside className={`w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-sm ${mobileView === 'editor' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* Tab Navigation Menu */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10 scrollbar-none overflow-x-auto shrink-0 select-none">
            <button
              onClick={() => setActiveTab('slides')}
              className={`flex-1 min-w-[64px] py-3.5 px-1.5 text-[11px] font-semibold flex flex-col items-center gap-1.5 transition duration-150 border-b-2 cursor-pointer relative ${
                activeTab === 'slides'
                  ? 'border-blue-600 text-blue-850 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-blue-700 hover:bg-slate-100/70:text-blue-400:bg-slate-800/50'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'slides' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Slides ({slides.length})</span>
              {activeTab === 'slides' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 min-w-[64px] py-3.5 px-1.5 text-[11px] font-semibold flex flex-col items-center gap-1.5 transition duration-150 border-b-2 cursor-pointer relative ${
                activeTab === 'editor'
                  ? 'border-blue-600 text-blue-850 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-blue-700 hover:bg-slate-100/70:text-blue-400:bg-slate-800/50'
              }`}
            >
              <Edit3 className={`w-3.5 h-3.5 ${activeTab === 'editor' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Editar</span>
              {activeTab === 'editor' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('pop')}
              className={`flex-1 min-w-[64px] py-3.5 px-1.5 text-[11px] font-semibold flex flex-col items-center gap-1.5 transition duration-150 border-b-2 cursor-pointer relative ${
                activeTab === 'pop'
                  ? 'border-blue-600 text-blue-850 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-blue-700 hover:bg-slate-100/70:text-blue-400:bg-slate-800/50'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'pop' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>POP</span>
              {activeTab === 'pop' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 min-w-[64px] py-3.5 px-1.5 text-[11px] font-semibold flex flex-col items-center gap-1.5 transition duration-150 border-b-2 cursor-pointer relative ${
                activeTab === 'images'
                  ? 'border-blue-600 text-blue-850 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-blue-700 hover:bg-slate-100/70:text-blue-400:bg-slate-800/50'
              }`}
            >
              <ImageIcon className={`w-3.5 h-3.5 ${activeTab === 'images' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Imagens ({uploadedImages.length})</span>
              {activeTab === 'images' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex-1 min-w-[64px] py-3.5 px-1.5 text-[11px] font-semibold flex flex-col items-center gap-1.5 transition duration-150 border-b-2 cursor-pointer relative ${
                activeTab === 'theme'
                  ? 'border-blue-600 text-blue-850 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-blue-700 hover:bg-slate-100/70:text-blue-400:bg-slate-800/50'
              }`}
            >
              <Palette className={`w-3.5 h-3.5 ${activeTab === 'theme' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Tema</span>
              {activeTab === 'theme' && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Tab Contents Frame */}
          <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5">
            
            {/* TAB: SLIDES LISTING */}
            {activeTab === 'slides' && (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2.5 block">ADICIONAR LAYOUT</label>
                  </div>

                  {/* Templates grids */}
                  <button
                    onClick={() => addSlide()}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition duration-150 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Slide em Branco</span>
                  </button>

                {/* Slides list item deck */}
                <div className="space-y-2.5 mt-4">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold block font-mono">Estrutura de Roteiro ({slides.length})</label>

                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {slides.map((s, idx) => {
                      const isActive = s.id === activeSlideId;
                      let label = 'Slide Livre';

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setPlayDirection(idx > activeSlideIndex ? 1 : -1);
                            setActiveSlideId(s.id);
                          }}
                          className={`group p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-blue-50/70 border-blue-500 border-l-4 border-l-amber-500 shadow-sm shadow-blue-100 ring-1 ring-blue-500/10'
                              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50/80 hover:border-slate-300:bg-slate-800/80:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2 overflow-hidden">
                            <span className={`text-[10px] font-mono font-bold w-4.5 h-4.5 flex items-center justify-center rounded ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {idx + 1}
                            </span>
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`text-[9px] font-mono font-extrabold px-1 py-0.5 rounded border ${isActive ? 'bg-blue-105 text-blue-800 border-blue-200' : 'bg-slate-105 text-slate-600 border-slate-200/80'}`}>
                                  {label}
                                </span>
                                {((s.transitionIn && s.transitionIn !== 'default') || (s.transitionOut && s.transitionOut !== 'default')) && (
                                  <span 
                                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-850 font-mono border border-amber-300/60 flex items-center gap-0.5 shrink-0" 
                                    title={`Efeitos personalizados ativos (Entrada: ${s.transitionIn || 'Padrão'}, Saída: ${s.transitionOut || 'Padrão'})`}
                                  >
                                    <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500 border-none shrink-0" />
                                    FX
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs font-bold mt-1 truncate ${isActive ? 'text-blue-950' : 'text-slate-700'}`}>
                                Slide com {s.elements?.length || 0} elementos
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions menu */}
                          <div className="flex items-center gap-0.5 ml-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => moveSlide(idx, 'up', e)}
                              disabled={idx === 0}
                              title="Subir Ordem"
                              className="p-1 rounded text-slate-505 hover:bg-slate-100 hover:text-blue-700 disabled:opacity-25 flex cursor-pointer:bg-slate-800:text-amber-400"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                            </button>
                            <button
                              onClick={(e) => moveSlide(idx, 'down', e)}
                              disabled={idx === slides.length - 1}
                              title="Descer Ordem"
                              className="p-1 rounded text-slate-550 hover:bg-slate-100 hover:text-blue-700 disabled:opacity-25 flex cursor-pointer:bg-slate-800:text-amber-400"
                            >
                              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                            </button>
                            <button
                              onClick={(e) => duplicateSlide(s, e)}
                              title="Duplicar Slide"
                              className="p-1 text-slate-550 hover:text-blue-700 hover:bg-blue-50 rounded flex cursor-pointer:text-blue-400:bg-blue-950/50"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => deleteSlide(s.id, e)}
                              title="Deletar Slide"
                              className="p-1 text-slate-455 hover:text-red-650 hover:bg-red-50 rounded flex cursor-pointer:text-red-400:bg-red-950/40"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </div>

                {/* Automation Global Settings from mockup */}
                <div className="border-t border-slate-200 pt-3 mt-1.5 shrink-0">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold mb-2.5 block font-mono">Configurações do Script</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-650 font-medium">Ajustar mídias no slide</span>
                      <button 
                        onClick={() => {
                          setFitImages(!fitImages);
                          addLog(`Configuração alterada: fitImagesToSlide = ${!fitImages}`);
                        }}
                        className={`w-8 h-4 rounded-full relative transition-colors duration-200 cursor-pointer ${fitImages ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${fitImages ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-650 font-medium">Extrair metadados EXIF</span>
                      <button 
                        onClick={() => {
                          setExtractExif(!extractExif);
                          addLog(`Configuração alterada: extractExifMetadata = ${!extractExif}`);
                        }}
                        className={`w-8 h-4 rounded-full relative transition-colors duration-200 cursor-pointer ${extractExif ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${extractExif ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-650 font-medium">Notas de Apresentador</span>
                      <button 
                        onClick={() => {
                          setSpeakerNotes(!speakerNotes);
                          addLog(`Configuração alterada: generateSpeakerNotes = ${!speakerNotes}`);
                        }}
                        className={`w-8 h-4 rounded-full relative transition-colors duration-200 cursor-pointer ${speakerNotes ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-205 ${speakerNotes ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic compilation brief from mockup */}
                  <div className="p-4 bg-gradient-to-br from-blue-900 to-indigo-950 rounded-xl border border-blue-800 mt-4 shadow-md shadow-blue-900/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <p className="text-[10px] text-blue-200 uppercase tracking-widest font-extrabold font-mono">Status do Compilador</p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <p className="text-[13px] font-black text-white tracking-tight">MOTOR ATIVO</p>
                        <p className="text-[10px] text-blue-300 font-mono mt-0.5">Sincronização em tempo real</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-amber-400 font-mono leading-none">{slides.length}</p>
                        <p className="text-[9px] text-blue-200 font-bold tracking-widest mt-1 uppercase">Slides Prontos</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: CONTENT EDITOR */}
            {activeTab === 'editor' && (
              <div className="space-y-5 text-slate-800">
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[10px] text-slate-500 font-extrabold font-mono tracking-wider">MODO DE EDIÇÃO ATUAL:</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-extrabold text-blue-900 font-mono">
                      {activeSlideIndex + 1}. Slide Livre
                    </span>
                    <span className="text-[10px] text-amber-600 font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-mono">
                      ID: {activeSlide.id}
                    </span>
                  </div>
                </div>

                {/* DYNAMIC FIELDSET FORM CONTROLS */}
                <div className="space-y-4">
                  
                  {/* ELEMENT CONTROLS */}
                  <div className="flex gap-2">
                    <button onClick={() => addElement('text')} className="flex-1 p-2 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200">
                      + Adicionar Texto
                    </button>
                    <button onClick={() => addElement('image')} className="flex-1 p-2 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200">
                      + Adicionar Imagem
                    </button>
                  </div>
                  
                  {selectedElementId ? (
                    (() => {
                      const el = activeSlide.elements.find(e => e.id === selectedElementId);
                      if (!el) return <p className="text-xs text-slate-500">Elemento não encontrado.</p>;
                      return (
                        <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-xl space-y-4 shadow-sm relative">
                          <div className="flex justify-between items-center pb-2 border-b border-blue-200/50">
                            <span className="text-xs font-bold text-blue-900 uppercase">Editando: {el.type === 'text' ? 'Caixa de Texto' : el.type === 'image' ? 'Mídia/Imagem' : 'Forma'}</span>
                            <button onClick={() => deleteElement(el.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors" title="Deletar Elemento">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {el.type === 'text' && (
                            <>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Conteúdo do Texto</label>
                                <textarea value={el.content || ''} onChange={(e) => updateElement(el.id, { content: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm" rows={3} />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tamanho da Fonte</label>
                                  <input type="number" value={el.fontSize || 24} onChange={(e) => updateElement(el.id, { fontSize: Number(e.target.value) })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alinhamento</label>
                                  <select value={el.align || 'left'} onChange={(e) => updateElement(el.id, { align: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                                    <option value="left">Esquerda</option>
                                    <option value="center">Centro</option>
                                    <option value="right">Direita</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estilo de Cor</label>
                                  <select value={el.color || 'text'} onChange={(e) => updateElement(el.id, { color: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                                    <option value="text">Primária (Escuro)</option>
                                    <option value="accent">Destaque (Ouro/Tema)</option>
                                    <option value="card">Claro / Fundo Alternativo</option>
                                  </select>
                                </div>
                                <div className="flex items-center pt-5 gap-2">
                                  <input type="checkbox" id={`bold-${el.id}`} checked={el.bold || false} onChange={(e) => updateElement(el.id, { bold: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                  <label htmlFor={`bold-${el.id}`} className="text-xs font-bold text-slate-700 cursor-pointer">Usar Negrito Forte</label>
                                </div>
                              </div>
                            </>
                          )}

                          {el.type === 'image' && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vincular Imagem do Repositório</label>
                                <select value={el.content || ''} onChange={(e) => updateElement(el.id, { content: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700">
                                  <option value="">-- Selecione uma imagem carregada --</option>
                                  {uploadedImages.map(img => <option key={img.id} value={img.id}>{img.name}</option>)}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1.5 italic">Dica: Adicione mais imagens na aba Imagens.</p>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modo de Enquadramento</label>
                                <select value={el.imageFit || 'cover'} onChange={(e) => updateElement(el.id, { imageFit: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white">
                                  <option value="cover">Preencher e Cortar Bordas (Cover)</option>
                                  <option value="contain">Conter Inteira na Caixa (Contain)</option>
                                  <option value="fill">Esticar (Fill)</option>
                                  <option value="scale-down">Tamanho Original ou Menor</option>
                                </select>
                              </div>
                            </div>
                          )}
                          
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mt-4">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">Nenhum elemento selecionado</p>
                      <p className="text-xs text-slate-400 mt-1">Clique em um elemento no slide à direita ou adicione um novo para editar suas propriedades.</p>
                    </div>
                  )}

                  {/* CUSTOM TRANSITIONS BLOCK FOR INDIVIDUAL SLIDES */}
                  <div className="border-t border-slate-200 pt-4 mt-3 space-y-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
                      <span className="text-xs font-extrabold text-blue-900 font-mono uppercase tracking-wider">
                        Transição Exclusiva do Slide
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Entrance Animation Dropdown */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                          Efeito de Entrada (In)
                        </label>
                        <select
                          value={activeSlide.transitionIn || 'default'}
                          onChange={(e) => {
                            updateSlideProp('transitionIn', e.target.value);
                            addLog(`Transição de Entrada do Slide ${activeSlideIndex + 1} alterada para: ${e.target.value}`);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="default">✦ Padrão do Deck (Global)</option>
                          <option value="slide-in-left">← Deslizar da Esquerda</option>
                          <option value="slide-in-right">→ Deslizar da Direita</option>
                          <option value="slide-in-up">↑ Deslizar de Baixo</option>
                          <option value="slide-in-down">↓ Deslizar de Cima</option>
                          <option value="fade-in">☉ Esmaecer (Fade In)</option>
                          <option value="zoom-in">🔍 Aproximação (Zoom In)</option>
                          <option value="flip-in">🔄 Giro 3D (Flip In)</option>
                        </select>
                      </div>

                      {/* Exit Animation Dropdown */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                          Efeito de Saída (Out)
                        </label>
                        <select
                          value={activeSlide.transitionOut || 'default'}
                          onChange={(e) => {
                            updateSlideProp('transitionOut', e.target.value);
                            addLog(`Transição de Saída do Slide ${activeSlideIndex + 1} alterada para: ${e.target.value}`);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="default">✦ Padrão do Deck (Global)</option>
                          <option value="slide-out-left">← Deslizar para Esquerda</option>
                          <option value="slide-out-right">→ Deslizar para Direita</option>
                          <option value="slide-out-up">↑ Deslizar para Cima</option>
                          <option value="slide-out-down">↓ Deslizar para Baixo</option>
                          <option value="fade-out">☉ Esmaecer (Fade Out)</option>
                          <option value="zoom-out">🔍 Afastamento (Zoom Out)</option>
                          <option value="flip-out">🔄 Giro 3D (Flip Out)</option>
                        </select>
                      </div>
                    </div>

                    {/* NEW TRANSITION SPEED & IMAGE ANIMATION OPTIONS PER SLIDE */}
                    <div className="grid grid-cols-2 gap-3.5 border-t border-slate-100 pt-3">

                      {/* Individual Slide transition duration override */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                            Duração ({activeSlide.transitionDurationOverride !== undefined ? `${activeSlide.transitionDurationOverride}s` : 'Global'})
                          </label>
                          {activeSlide.transitionDurationOverride !== undefined && (
                            <button
                              onClick={() => {
                                updateSlideProp('transitionDurationOverride', undefined);
                                addLog(`Restaurado tempo global de transição para o Slide ${activeSlideIndex + 1}`);
                              }}
                              className="text-[9px] text-red-500 hover:text-red-700 font-mono font-bold bg-red-50/50 px-1 border border-red-200/50 rounded cursor-pointer"
                              title="Restaurar padrão global"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          value={activeSlide.transitionDurationOverride !== undefined ? activeSlide.transitionDurationOverride : globalTransitionDuration}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateSlideProp('transitionDurationOverride', val);
                            addLog(`Tempo de transição do Slide ${activeSlideIndex + 1} modificado para: ${val}s`);
                          }}
                          className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer my-2"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 font-mono italic">
                      * Personalize cada slide de forma autônoma para criar apresentações dinâmicas e fluidas.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: BATCH DOCUMENT PROCESSOR -> NOW EXCLUSIVE POP */}
            {activeTab === 'pop' && (
              <div className="space-y-5">
                <div className="bg-indigo-900/10 p-3.5 rounded-xl border border-indigo-200 shadow-sm animate-fade-in">
                  <span className="text-xs text-indigo-900 font-mono font-extrabold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Motor WA Fort (POP)
                  </span>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                    Cole o texto bruto do seu <b>Procedimento Operacional Padrão</b> abaixo. O motor inteligente lerá os tópicos, formatará as cores corporativas, inserirá a Logo WA Fort automaticamente, calculará a altura das frases e dividirá o conteúdo em múltiplas páginas perfeitas.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <button
                      onClick={insertMockMarkdownExample}
                      className="text-xs text-indigo-700 hover:text-indigo-800 flex items-center gap-1 font-extrabold cursor-pointer bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Exemplo: Triagem de Atendimentos
                    </button>
                    <span className="text-slate-500 font-bold font-mono">Motor Exclusivo</span>
                  </div>

                  <textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    rows={12}
                    placeholder="Cole seu procedimento POP aqui..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-lg p-3 text-xs font-mono text-slate-800 focus:outline-none transition-all"
                  />
                </div>

                <button
                  onClick={runPOPCompile}
                  className="w-full bg-indigo-900 hover:bg-indigo-800 text-amber-400 font-extrabold py-3.5 px-4 rounded-xl transition duration-155 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950/20 border border-amber-500/30 mt-4"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Gerar Telas do Procedimento (POP)</span>
                </button>
              </div>
            )}

            {/* TAB: IMAGE MANAGER */}
            {activeTab === 'images' && (
              <div className="space-y-5">
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[10px] text-blue-900 font-extrabold font-mono tracking-wider">REPOSITÓRIO LOCAL DE MÍDIAS:</span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                    Carregue imagens locais (PNG, JPG) para visualização em tempo real e embutimento nativo no script de automação python-pptx em código base64.
                  </p>
                </div>

                {/* File input design */}
                <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-6 transition duration-150 text-center flex flex-col items-center justify-center bg-slate-50/70">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageFileLoad}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-10 h-10 text-blue-600 mb-2 animate-bounce" />
                  <span className="text-xs font-bold text-slate-700">Arraste fotos ou clique para carregar</span>
                  <span className="text-[10px] text-slate-400 mt-1 font-mono">Formatos aceitos: JPG, PNG, WEBP (Max 5MB)</span>
                </div>

                {/* Uploaded media list */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                    Arquivos no Repositório ({uploadedImages.length})
                  </h3>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {uploadedImages.map((img) => (
                      <div
                        key={img.id}
                        className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                          />
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-700 truncate" title={img.name}>
                              {img.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Ref: {img.id} • {img.size}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeUploadedImage(img.id)}
                          className="p-1.5 text-slate-450 hover:text-red-650 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer transition-colors"
                          title="Remover Mídia local"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {uploadedImages.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-6 font-mono font-medium">
                        Nenhum arquivo de imagem carregado neste navegador.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: THEME MANAGER */}
            {activeTab === 'theme' && (
              <div className="space-y-5">
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 shadow-sm animate-fade-in">
                  <span className="text-[10px] text-blue-900 font-extrabold font-mono tracking-wider">PALETAS DE CORES & TIPOGRAFIA:</span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                    Altere o design da apresentação inteira instantaneamente. As fontes e cores serão refletidas no leitor e replicadas na biblioteca python-pptx do script exportado.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Formato da Apresentação</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAspectRatio('16:9')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${aspectRatio === '16:9' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                      Widescreen (16:9)
                    </button>
                    <button
                      onClick={() => setAspectRatio('9:16')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${aspectRatio === '9:16' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                      Vertical / Reels (9:16)
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {THEMES.map((theme) => {
                    const isSelected = theme.id === selectedThemeId;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex justify-between items-center cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/85 border-blue-500 border-l-4 border-l-amber-500 shadow-sm shadow-blue-100 ring-1 ring-blue-500/10'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50/90 hover:border-slate-350'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className={`text-sm font-bold block ${isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-705'}`}>{theme.name}</span>
                          <span className={`text-[11px] font-mono uppercase block ${isSelected ? 'text-blue-700/80 font-bold' : 'text-slate-450'}`}>
                            Header: {theme.fontHeading.includes('serif') ? 'Serifa Elegante' : theme.fontHeading.includes('mono') ? 'Mono Grid' : 'Sans-Serif'}
                          </span>
                        </div>

                        {/* Colors Preview dots */}
                        <div className="flex gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                          <div
                            className="w-4 h-4 rounded-full border border-slate-300/60"
                            style={{ backgroundColor: theme.previewBg }}
                            title="Fundo"
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-slate-300/60"
                            style={{ backgroundColor: theme.previewText }}
                            title="Texto"
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-slate-300/60"
                            style={{ backgroundColor: theme.previewAccent }}
                            title="Acento"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* DIREITOS AUTORAIS / LOGO */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 shrink-0">
            <img src="https://i.ibb.co/C32GVNqh/logo.webp" alt="WA Fort Logo" className="h-8 object-contain drop-shadow-sm" />
            <p className="text-[10px] text-slate-500 font-mono font-bold text-center">
              Desenvolvido por Natan Marinho<br />
              para WA Fort &copy; {new Date().getFullYear()}
            </p>
          </div>
        </aside>

        {/* Right Side: Visual Slide Showcase aspect ratio & Code Editor script panel */}
        <section className={`flex-1 bg-slate-950 flex flex-col overflow-y-auto ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* Top Slideshow Control bar */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-0 md:h-14 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 sticky top-0 z-10 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={triggerPrevSlide}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-750 disabled:opacity-25 border border-slate-200 cursor-pointer transitionDuration-100:bg-slate-705"
                title="Slide Anterior"
              >
                <ChevronLeft className="w-4 h-4 shrink-0 text-slate-600" />
              </button>
              <span className="text-[11px] font-extrabold text-blue-900 font-mono bg-blue-50/70 px-2.5 py-1.5 rounded-lg border border-blue-200 shrink-0">
                SLIDE {activeSlideIndex + 1} / {slides.length}
              </span>
              <button
                onClick={triggerNextSlide}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-750 disabled:opacity-25 border border-slate-200 cursor-pointer transitionDuration-100:bg-slate-705"
                title="Próximo Slide"
              >
                <ChevronRight className="w-4 h-4 shrink-0 text-slate-600" />
              </button>
 
              {/* Autoplay layout toggle */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1.5 rounded-lg border flex items-center space-x-1.5 transition duration-150 text-[11px] font-bold cursor-pointer ${
                  isPlaying
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/50'
                    : 'bg-slate-50 border-slate-200 text-slate-705 hover:bg-slate-100:bg-slate-705'
                }`}
                title="Toggle Apresentação de Slides Automática"
              >
                <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-emerald-600 text-emerald-600 border-none' : 'text-slate-600'}`} />
                <span className="hidden xs:inline sm:inline">{isPlaying ? 'Autoplay Ativo' : 'Autoplay'}</span>
              </button>
 
              {isPlaying && (
                <select
                  value={autoplaySpeed}
                  onChange={(e) => setAutoplaySpeed(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-705 text-[11px] px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer font-bold shadow-sm"
                  title="Velocidade de Transição"
                >
                  <option value={2}>2s</option>
                  <option value={4}>4s</option>
                  <option value={6}>6s</option>
                  <option value={8}>8s</option>
                </select>
              )}
 
              {/* Toggle Fullscreen button */}
              <button
                onClick={toggleFullscreen}
                className={`p-1.5 rounded-lg border flex items-center space-x-1.5 transition duration-150 text-[11px] font-bold cursor-pointer ${
                  isFullscreen
                    ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                    : 'bg-slate-50 border-slate-200 text-slate-705 hover:bg-slate-100'
                }`}
                title="Tela Cheia (Esc para Sair)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span className="hidden xs:inline sm:inline">{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
              </button>
            </div>
 
            {/* Transition variant selections */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] uppercase text-slate-500 font-mono hidden lg:inline font-extrabold tracking-wider">Transição:</span>
                <select
                  value={transition}
                  onChange={(e) => setTransition(e.target.value as TransitionType)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer font-extrabold shadow-sm"
                  title="Efeito de transição de slides em tempo real"
                >
                  <option value="slide">Deslizar (Swipe)</option>
                  <option value="fade">Esmaecer (Fade)</option>
                  <option value="zoom">Aproximação (Zoom)</option>
                  <option value="flip">Giro 3D (Flip)</option>
                </select>
              </div>
 
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] uppercase text-slate-500 font-mono hidden lg:inline font-extrabold tracking-wider">Velocidade:</span>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={globalTransitionDuration}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGlobalTransitionDuration(val);
                    addLog(`Duração da transição global alterada para: ${val}s`);
                  }}
                  className="w-16 sm:w-20 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title="Velocidade da animação em segundos"
                />
                <span className="text-[10px] font-mono font-extrabold text-blue-900 bg-blue-50/70 border border-blue-200 p-1 rounded min-w-[32px] text-center shadow-xs">
                  {globalTransitionDuration}s
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] uppercase text-slate-500 font-mono hidden lg:inline font-extrabold tracking-wider">Fotos:</span>
                <select
                  value={globalImageAnimation}
                  onChange={(e) => {
                    setGlobalImageAnimation(e.target.value);
                    addLog(`Animação global de fotos alterada para: ${e.target.value}`);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer font-extrabold shadow-sm"
                  title="Animação contínua ou de entrada para todas as imagens"
                >
                  <option value="zoom-in">🔍 Aproximação Suave</option>
                  <option value="slide-up">↑ Deslizar por baixo</option>
                  <option value="bounce">🏀 Salto com Elástico</option>
                  <option value="rotate">🔄 Girar Entrada</option>
                  <option value="pulse">💗 Pulsação Contínua</option>
                  <option value="float">🎈 Flutuação Contínua</option>
                  <option value="ken-burns">🎞️ Zoom Cinematográfico</option>
                  <option value="none">☉ Somente Fade (Sem efeito)</option>
                </select>
              </div>
            </div>
          </div>

          <div className={isFullscreen 
            ? "fixed inset-0 z-[100] bg-slate-950 p-6 md:p-12 flex flex-col justify-center items-center overflow-hidden transition-all duration-300" 
            : "p-6 flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full space-y-6"
          }>
            {isFullscreen && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-2 rounded-xl shadow-2xl select-none">
                <button
                  type="button"
                  onClick={triggerPrevSlide}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                  title="Slide Anterior (Seta Esquerda)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-950 border border-slate-850 py-1.5 px-3 rounded-lg font-mono">
                  SLIDE {activeSlideIndex + 1} de {slides.length}
                </span>
                <button
                  type="button"
                  onClick={triggerNextSlide}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                  title="Próximo Slide (Seta Direita / Espaço)"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                
                <div className="h-6 w-px bg-slate-800 mx-1" />

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                    isPlaying 
                      ? 'bg-blue-900 hover:bg-blue-800 border border-blue-600 text-amber-400' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                  }`}
                  title="Play / Pause automático"
                >
                  <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-amber-400 text-amber-400 border-none' : ''}`} />
                  <span className="hidden sm:inline">{isPlaying ? 'Tocando' : 'Slideshow'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 ml-1 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 hover:text-white rounded-lg border border-blue-900/30 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Sair da tela cheia (Esc)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            )}
            
            {/* STAGE: THE 16:9 DYNAMIC CANVAS FRAME */}
            <div 
              className={isFullscreen 
                ? "w-full max-w-6xl relative shadow-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 transition-all duration-300 max-h-[82vh] touch-none"
                : "w-full relative shadow-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 transition-all duration-300 touch-none"
              }
              style={{ aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16' }}
            >
              <div 
                ref={canvasRef} 
                className="relative w-full overflow-hidden select-none" 
                style={{ aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16' }}
                onPointerMove={(e) => {
                  if (!canvasRef.current) return;
                  const rect = canvasRef.current.getBoundingClientRect();
                  
                  if (draggingNode) {
                    const dx = e.clientX - draggingNode.startX;
                    const dy = e.clientY - draggingNode.startY;
                    const dxPercent = (dx / rect.width) * 100;
                    const dyPercent = (dy / rect.height) * 100;
                    const newX = Math.max(0, draggingNode.startElX + dxPercent);
                    const newY = Math.max(0, draggingNode.startElY + dyPercent);
                    updateElement(draggingNode.id, { x: newX, y: newY });
                    return;
                  }

                  if (resizingNode) {
                    const dx = e.clientX - resizingNode.startX;
                    const dy = e.clientY - resizingNode.startY;
                    const dxPercent = (dx / rect.width) * 100;
                    const dyPercent = (dy / rect.height) * 100;
                    
                    let newW = resizingNode.startWidth;
                    let newH = resizingNode.startHeight;
                    
                    if (resizingNode.direction.includes('r')) newW = Math.max(2, resizingNode.startWidth + dxPercent);
                    if (resizingNode.direction.includes('b')) newH = Math.max(2, resizingNode.startHeight + dyPercent);
                    
                    updateElement(resizingNode.id, { width: newW, height: newH });
                  }
                }}
                onPointerUp={() => { setDraggingNode(null); setResizingNode(null); }}
                onPointerLeave={() => { setDraggingNode(null); setResizingNode(null); }}
              >
                
                {/* Animate slide transitions */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    custom={playDirection}
                    variants={getTransitionVariant(activeSlide)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className={`canvas-frame absolute inset-0 px-[8%] py-[6%] flex flex-col justify-between ${currentTheme.bg} ${currentTheme.color} overflow-hidden`}
                  >
                    {/* Render visual elements according to active slide layout */}
                    
                    {/* Theme visual helper decorations inside canvas */}
                    {selectedThemeId === 'studio_tech' && (
                      <div className="absolute top-2 left-4 text-[9px] font-mono opacity-50 uppercase tracking-widest text-slate-400">
                        ESTÚDIO TECH COMPILADOR // ID: {activeSlide.id}
                      </div>
                    )}
                    {selectedThemeId === 'warm_editorial' && (
                      <div className="absolute top-4 right-6 text-[10px] font-serif italic text-amber-900">
                        Seção Editorial {activeSlideIndex + 1}
                      </div>
                    )}

                    {/* THE NEW ELEMENT-BASED RENDERING ENGINE (Rnd) */}
                    <div className="flex-1 w-full h-full relative" onPointerDown={() => {
                      setSelectedElementId(null);
                      setEditingElementId(null);
                    }}>
                      {activeSlide.elements.map(el => {
                        const isEditing = editingElementId === el.id;
                        return (
                          <div
                            key={el.id}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedElementId(el.id);
                              if (editingElementId !== el.id) {
                                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                setDraggingNode({
                                  id: el.id,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  startElX: el.x,
                                  startElY: el.y
                                });
                              }
                            }}
                            onDoubleClick={(e) => {
                              if (el.type !== 'text') return;
                              e.stopPropagation();
                              setEditingElementId(el.id);
                            }}
                            className={`group border ${selectedElementId === el.id ? 'border-amber-400 shadow-md ring-2 ring-amber-400/50 z-[100]' : 'border-transparent hover:border-blue-400 hover:border-dashed z-10'} ${draggingNode?.id === el.id ? 'cursor-grabbing opacity-90' : 'cursor-grab'} transition-colors duration-100 flex items-center justify-center`}
                            style={{ 
                              position: 'absolute',
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${el.width}%`,
                              height: `${el.height}%`
                            }}
                          >
                          <div className={`w-full h-full flex ${el.type === 'text' ? 'flex-col' : 'items-center justify-center'}`}>
                            {el.type === 'text' && (
                              <>
                                {editingElementId === el.id ? (
                                  <textarea
                                    autoFocus
                                    defaultValue={el.content || ''}
                                    onBlur={(e) => {
                                      updateElement(el.id, { content: e.target.value });
                                      setEditingElementId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.ctrlKey) {
                                        e.preventDefault();
                                        updateElement(el.id, { content: e.currentTarget.value });
                                        setEditingElementId(null);
                                      }
                                    }}
                                    className="w-full h-full bg-blue-50/90 text-blue-900 rounded p-2 focus:outline-none resize-none"
                                    placeholder="Ctrl+Enter para salvar"
                                    style={{ 
                                      fontSize: `${el.fontSize || 24}px`, 
                                      textAlign: el.align || 'left',
                                      fontWeight: el.bold ? 'bold' : 'normal'
                                    }}
                                  />
                                ) : (
                                  <p 
                                    style={{ 
                                      fontSize: `${el.fontSize || 24}px`, 
                                      textAlign: el.align || 'left',
                                      fontWeight: el.bold ? 'bold' : 'normal'
                                    }}
                                    className={`w-full h-full whitespace-pre-wrap overflow-hidden select-text p-2 ${
                                      el.color === 'accent' ? currentTheme.accent : el.color === 'card' ? 'text-white' : ''
                                    }`}
                                  >
                                    {el.content || 'Texto'}
                                  </p>
                                )}
                                
                                {selectedElementId === el.id && editingElementId !== el.id && (
                                  <>
                                    <button
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                        setEditingElementId(el.id);
                                      }}
                                      className="absolute -top-3 -right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5 shadow-lg flex items-center justify-center z-50 transition-transform active:scale-95 cursor-pointer"
                                      title="Editar Texto"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    
                                    {/* Right Edge Handle */}
                                    <div 
                                      className="absolute -right-1.5 top-0 w-4 h-full cursor-e-resize z-50 hover:bg-amber-400/40 transition-colors rounded-r-md"
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                        setResizingNode({ id: el.id, startX: e.clientX, startY: e.clientY, startWidth: el.width, startHeight: el.height, direction: 'r' });
                                      }}
                                    />
                                    
                                    {/* Bottom Edge Handle */}
                                    <div 
                                      className="absolute left-0 -bottom-1.5 w-full h-4 cursor-s-resize z-50 hover:bg-amber-400/40 transition-colors rounded-b-md"
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                        setResizingNode({ id: el.id, startX: e.clientX, startY: e.clientY, startWidth: el.width, startHeight: el.height, direction: 'b' });
                                      }}
                                    />

                                    {/* Bottom Right Corner Handle */}
                                    <div 
                                      className="absolute -right-2 -bottom-2 w-5 h-5 bg-white border-2 border-amber-500 rounded-full cursor-se-resize z-50 shadow-md hover:scale-125 transition-transform"
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                        setResizingNode({ id: el.id, startX: e.clientX, startY: e.clientY, startWidth: el.width, startHeight: el.height, direction: 'br' });
                                      }}
                                    />
                                  </>
                                )}
                              </>
                            )}
                            {el.type === 'image' && (
                              <div className="w-full h-full">
                                {el.content && uploadedImages.find(i => i.id === el.content) ? (
                                  <img 
                                    src={uploadedImages.find(i => i.id === el.content)?.dataUrl} 
                                    alt="Elemento" 
                                    className="w-full h-full"
                                    style={{ objectFit: (el.imageFit as any) || 'cover' }}
                                    draggable={false}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-200/50 text-slate-400 border border-slate-300 border-dashed rounded-lg">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                  </div>
                                )}
                              </div>
                            )}
                            {el.type === 'shape' && (
                              <div className={`w-full h-full rounded-xl opacity-80 ${el.color === 'card' ? 'bg-slate-200/50' : 'bg-blue-500'}`} />
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>

                    {/* BOTTOM STATUS FOOTER OF SLIDES */}
                    <div className="flex justify-between items-center text-[10px] sm:text-xs shrink-0 select-none opacity-40 font-mono border-t border-slate-500/10 pt-2 text-slate-400">
                      <span>Pro Deck Automação</span>
                      <span>Pág {activeSlideIndex + 1} de {slides.length}</span>
                    </div>
                  </motion.div>
                </AnimatePresence>

              </div>
            </div>


          </div>

        </section>

      </main>
    </div>
  );
}
