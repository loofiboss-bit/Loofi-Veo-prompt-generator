export interface VideoGenerationStageLabels {
  init: string;
  render: string;
  finalize: string;
}

export const videoGenerationStages = {
  en: {
    init: 'Initializing',
    render: 'Rendering',
    finalize: 'Finalizing',
  },
  sv: {
    init: 'Initierar',
    render: 'Renderar',
    finalize: 'Slutför',
  },
  es: {
    init: 'Iniciando',
    render: 'Renderizando',
    finalize: 'Finalizando',
  },
  fr: {
    init: 'Initialisation',
    render: 'Rendu',
    finalize: 'Finalisation',
  },
  ja: {
    init: '初期化中',
    render: 'レンダリング中',
    finalize: '仕上げ中',
  },
  ar: {
    init: 'جارٍ التهيئة',
    render: 'جارٍ المعالجة',
    finalize: 'جارٍ الإنهاء',
  },
  de: {
    init: 'Initialisierung',
    render: 'Rendern',
    finalize: 'Abschluss',
  },
} satisfies Record<string, VideoGenerationStageLabels>;
