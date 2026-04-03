import type { TFile } from "obsidian";

export const PRETTY_READER_VIEW_TYPE = "pretty-reader-view";

export const LAYOUT_OPTIONS = ["article", "paper", "cards"] as const;
export type PrettyLayout = (typeof LAYOUT_OPTIONS)[number];

export const THEME_OPTIONS = [
  "warm-paper",
  "graphite",
  "clean-sky",
] as const;
export type PrettyTheme = (typeof THEME_OPTIONS)[number];

export interface PrettyReaderSettings {
  defaultLayout: PrettyLayout;
  defaultTheme: PrettyTheme;
  exportDirectory: string;
}

export const DEFAULT_SETTINGS: PrettyReaderSettings = {
  defaultLayout: "article",
  defaultTheme: "warm-paper",
  exportDirectory: "exports/pretty-reader",
};

export interface PrettyReaderViewState extends Record<string, unknown> {
  file?: string;
}

export interface PrettyHeading {
  level: number;
  text: string;
  anchor: string;
}

export type PrettyResourceKind = "cover" | "image";

export interface PrettyResolvedResource {
  kind: PrettyResourceKind;
  reference: string;
  isExternal: boolean;
  externalUrl?: string;
  resolvedFile?: TFile;
  resolvedPath?: string;
  assetFileName?: string;
}

export interface PrettyCardSection {
  markdown: string;
}

export interface PrettyReaderDocument {
  file: TFile;
  filePath: string;
  title: string;
  subtitle?: string;
  author?: string;
  layout: PrettyLayout;
  theme: PrettyTheme;
  toc: boolean;
  wordCount: number;
  readingMinutes: number;
  updatedLabel: string;
  rawMarkdown: string;
  displayMarkdown: string;
  exportMarkdown: string;
  headings: PrettyHeading[];
  cards: PrettyCardSection[];
  exportCards: PrettyCardSection[];
  cover?: PrettyResolvedResource;
  resources: PrettyResolvedResource[];
}
