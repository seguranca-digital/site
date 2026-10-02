export type PictogramSource =
  | { kind: 'arasaac'; id: number }
  | { kind: 'custom'; blobKey: string }
  | { kind: 'none' };

export type WordClass =
  | 'pessoa' | 'acao' | 'coisa' | 'descricao'
  | 'social' | 'pergunta' | 'negacao' | 'outro';

export interface Card {
  id: string;
  label: string;
  speech?: string;
  searchTerm?: string;
  arasaacId?: number;
  picto: PictogramSource;
  wordClass: WordClass;
  hidden?: boolean;
}

export interface Category {
  id: string;
  name: string;
  searchTerm?: string;
  arasaacId?: number;
  picto: PictogramSource;
  cardIds: string[];
}

export interface Board {
  version: 1;
  quickPhraseIds: string[];
  categories: Category[];
  cards: Record<string, Card>;
}

export interface Settings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
  speakOnTap: boolean;
  clearAfterSpeak: boolean;
  gridColumns: number;
  fontScale: number;
  showLabels: boolean;
  theme: 'claro' | 'escuro' | 'alto-contraste';
  scanning: {
    enabled: boolean;
    mode: 'automatica' | 'dois-botoes';
    intervalMs: number;
    acceptanceMs: number;
    auditoryPreview: boolean;
    loopsBeforePause: number;
  };
}
