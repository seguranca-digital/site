export type PictogramSource =
  | { kind: 'arasaac'; id: number } // imagem em /pictogramas/{id}.png ou salva no IndexedDB
  | { kind: 'custom'; blobKey: string } // foto enviada pelo cuidador, salva no IndexedDB
  | { kind: 'none' };

// Classe gramatical -> cor da borda (Chave de Fitzgerald adaptada)
export type WordClass =
  | 'pessoa' | 'acao' | 'coisa' | 'descricao'
  | 'social' | 'pergunta' | 'negacao' | 'outro';

export interface Card {
  id: string;
  label: string; // texto exibido no botão
  speech?: string; // texto falado, se diferente do label
  // ex.: label "Banheiro" -> fala "Preciso ir ao banheiro"
  searchTerm?: string; // termo de busca no ARASAAC, se diferente do label
  arasaacId?: number; // força um pictograma específico (sobrepõe a busca)
  picto: PictogramSource;
  wordClass: WordClass;
  hidden?: boolean;
}

export interface Category {
  id: string;
  name: string;
  searchTerm?: string; // termo de busca no ARASAAC, se diferente do nome
  arasaacId?: number; // força um pictograma específico (sobrepõe a busca)
  picto: PictogramSource;
  cardIds: string[];
}

export interface Board {
  version: 1;
  quickPhraseIds: string[]; // linha fixa, sempre visível
  categories: Category[];
  cards: Record<string, Card>;
}

export interface Settings {
  voiceURI: string | null;
  rate: number; // 0.5–2 (padrão 0.9)
  pitch: number; // 0–2 (padrão 1)
  volume: number; // 0–1 (padrão 1)
  speakOnTap: boolean; // fala a palavra ao tocar no card (padrão true)
  clearAfterSpeak: boolean; // limpa a frase depois de falar (padrão false)
  gridColumns: number; // 2–6 (padrão 4)
  fontScale: number; // 1–2 (padrão 1)
  showLabels: boolean; // mostra o texto sob o pictograma (padrão true)
  theme: 'claro' | 'escuro' | 'alto-contraste';
  scanning: {
    enabled: boolean;
    mode: 'automatica' | 'dois-botoes';
    intervalMs: number; // 500–5000 (padrão 1500)
    acceptanceMs: number; // tempo mínimo pressionado para valer (padrão 0)
    auditoryPreview: boolean; // fala baixo o nome do item destacado
    loopsBeforePause: number; // voltas sem seleção antes de pausar (padrão 3)
  };
}
