import {
  App,
  ItemView,
  Menu,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  ViewStateResult,
  WorkspaceLeaf,
  normalizePath,
} from "obsidian";
import {
  buildPrettyReaderDocument,
  normalizeExportDirectory,
} from "./src/document";
import { exportPrettyReaderHtml } from "./src/exporter";
import { renderPrettyReaderDocument } from "./src/render";
import {
  COLUMN_MODE_OPTIONS,
  DEFAULT_SETTINGS,
  LAYOUT_OPTIONS,
  PRETTY_READER_VIEW_TYPE,
  THEME_OPTIONS,
  type PrettyColumnMode,
  type PrettyLayout,
  type PrettyNotePreference,
  type PrettyReaderDocument,
  type PrettyReaderSettings,
  type PrettyReaderViewState,
  type PrettyTheme,
  supportsColumnMode,
} from "./src/types";

class PrettyReaderView extends ItemView {
  plugin: PrettyReaderPlugin;
  private state: PrettyReaderViewState = {};
  private currentDocument?: PrettyReaderDocument;

  constructor(leaf: WorkspaceLeaf, plugin: PrettyReaderPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.navigation = true;
  }

  getViewType(): string {
    return PRETTY_READER_VIEW_TYPE;
  }

  getDisplayText(): string {
    if (!this.state.file) {
      return "Pretty Reader";
    }

    const abstractFile = this.app.vault.getAbstractFileByPath(this.state.file);
    if (abstractFile instanceof TFile) {
      return `${abstractFile.basename} | Pretty Reader`;
    }

    return "Pretty Reader";
  }

  getIcon(): string {
    return "book-open";
  }

  getState(): PrettyReaderViewState {
    return this.state;
  }

  async setState(
    state: PrettyReaderViewState,
    result: ViewStateResult,
  ): Promise<void> {
    this.state = {
      file: state.file,
    };
    await this.renderView();
    return super.setState(state, result);
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("pretty-reader-view");
    this.contentEl.setAttribute("tabindex", "0");
    this.registerDomEvent(this.contentEl, "contextmenu", (event) => {
      this.handleContextMenu(event);
    });
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.path === this.state.file) {
          void this.renderView();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && this.state.file === oldPath) {
          this.state.file = file.path;
          void this.renderView();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile && file.path === this.state.file) {
          void this.renderEmpty("The source note was deleted.");
        }
      }),
    );
    await this.renderView();
  }

  async renderView(): Promise<void> {
    this.contentEl.empty();
    if (!this.state.file) {
      await this.renderEmpty("Open a Markdown note to start Pretty Reader.");
      return;
    }

    const abstractFile = this.app.vault.getAbstractFileByPath(this.state.file);
    if (!(abstractFile instanceof TFile)) {
      await this.renderEmpty("The selected note is no longer available.");
      return;
    }

    const prettyDocument = await buildPrettyReaderDocument(
      this.app,
      abstractFile,
      this.plugin.settings,
    );
    this.currentDocument = prettyDocument;

    await renderPrettyReaderDocument({
      app: this.app,
      component: this,
      containerEl: this.contentEl,
      prettyDocument,
      mode: "view",
    });
  }

  async renderEmpty(message: string): Promise<void> {
    this.contentEl.empty();
    this.currentDocument = undefined;
    const emptyState = this.contentEl.createDiv({
      cls: "pretty-reader-empty-state",
    });
    emptyState.createEl("h2", { text: "Pretty Reader" });
    emptyState.createEl("p", { text: message });
  }

  private handleContextMenu(event: MouseEvent): void {
    if (!this.currentDocument) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node) || !this.contentEl.contains(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const menu = new Menu();
    const selectedText = this.getSelectedText();
    const notePreference = this.plugin.getNotePreference(this.currentDocument.filePath);

    menu.addItem((item) => {
      item
        .setTitle("Copy selected text")
        .setIcon("copy")
        .setDisabled(selectedText.length === 0)
        .onClick(() => {
          void this.copyText(selectedText);
        });
    });

    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("Theme").setIsLabel(true);
    });

    for (const theme of THEME_OPTIONS) {
      menu.addItem((item) => {
        item
          .setTitle(theme)
          .setChecked(this.currentDocument?.theme === theme)
          .onClick(() => {
            void this.plugin.setNoteTheme(this.currentDocument!.filePath, theme);
          });
      });
    }

    menu.addItem((item) => {
      item
        .setTitle("Reset theme")
        .setIcon("rotate-ccw")
        .setDisabled(!notePreference.theme)
        .onClick(() => {
          void this.plugin.resetNoteTheme(this.currentDocument!.filePath);
        });
    });

    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("Column mode").setIsLabel(true);
    });

    if (!supportsColumnMode(this.currentDocument.layout)) {
      menu.addItem((item) => {
        item.setTitle("Dual column unavailable for cards").setDisabled(true);
      });
    } else {
      for (const columnMode of COLUMN_MODE_OPTIONS) {
        menu.addItem((item) => {
          item
            .setTitle(
              columnMode === "single" ? "Single column" : "Dual column",
            )
            .setChecked(this.currentDocument?.columnMode === columnMode)
            .onClick(() => {
              void this.plugin.setNoteColumnMode(
                this.currentDocument!.filePath,
                columnMode,
              );
            });
        });
      }
    }

    menu.showAtMouseEvent(event);
  }

  private getSelectedText(): string {
    const selection = this.contentEl.ownerDocument.getSelection();
    if (!selection || selection.isCollapsed) {
      return "";
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode || !focusNode) {
      return "";
    }

    if (!this.contentEl.contains(anchorNode) || !this.contentEl.contains(focusNode)) {
      return "";
    }

    return selection.toString().trim();
  }

  private async copyText(text: string): Promise<void> {
    if (!text) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!this.fallbackCopyText(text)) {
        throw new Error("Clipboard API unavailable");
      }
      new Notice("Selected text copied.");
    } catch {
      if (this.fallbackCopyText(text)) {
        new Notice("Selected text copied.");
      } else {
        new Notice("Unable to copy selected text.");
      }
    }
  }

  private fallbackCopyText(text: string): boolean {
    const doc = this.contentEl.ownerDocument;
    const textarea = doc.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    doc.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = doc.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export default class PrettyReaderPlugin extends Plugin {
  settings: PrettyReaderSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile) {
          void this.handleFileRename(oldPath, file.path);
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile) {
          void this.handleFileDelete(file.path);
        }
      }),
    );

    const ribbonIconEl = this.addRibbonIcon(
      "book-open",
      "Open Pretty Reader",
      () => {
        void this.openPrettyReader();
      },
    );
    ribbonIconEl.addClass("pretty-reader-ribbon-button");

    this.registerView(
      PRETTY_READER_VIEW_TYPE,
      (leaf) => new PrettyReaderView(leaf, this),
    );

    this.addCommand({
      id: "open-pretty-reader",
      name: "Open Pretty Reader",
      callback: () => {
        void this.openPrettyReader();
      },
    });

    this.addCommand({
      id: "export-pretty-reader-html",
      name: "Export Pretty Reader HTML",
      callback: () => {
        void this.exportActiveNote();
      },
    });

    this.addSettingTab(new PrettyReaderSettingTab(this.app, this));
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(PRETTY_READER_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      defaultLayout: this.parseLayoutValue(loaded?.defaultLayout),
      defaultTheme: this.parseThemeValue(loaded?.defaultTheme),
      exportDirectory: normalizeExportDirectory(
        loaded?.exportDirectory ?? DEFAULT_SETTINGS.exportDirectory,
      ),
      notePreferences: this.normalizeNotePreferences(loaded?.notePreferences),
    };
  }

  async saveSettings(): Promise<void> {
    this.settings.exportDirectory = normalizeExportDirectory(
      this.settings.exportDirectory,
    );
    this.settings.notePreferences = this.normalizeNotePreferences(
      this.settings.notePreferences,
    );
    await this.saveData(this.settings);
    await this.rerenderPrettyReaderLeaves();
  }

  private parseLayoutValue(value: unknown): PrettyLayout {
    return LAYOUT_OPTIONS.includes(value as PrettyLayout)
      ? (value as PrettyLayout)
      : DEFAULT_SETTINGS.defaultLayout;
  }

  private parseThemeValue(value: unknown): PrettyTheme {
    return THEME_OPTIONS.includes(value as PrettyTheme)
      ? (value as PrettyTheme)
      : DEFAULT_SETTINGS.defaultTheme;
  }

  private normalizeNotePreferences(
    value: unknown,
  ): Record<string, PrettyNotePreference> {
    if (!value || typeof value !== "object") {
      return {};
    }

    const normalized: Record<string, PrettyNotePreference> = {};
    for (const [filePath, preference] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (!preference || typeof preference !== "object") {
        continue;
      }

      const nextPreference: PrettyNotePreference = {};
      const rawTheme = (preference as Record<string, unknown>).theme;
      const rawColumnMode = (preference as Record<string, unknown>).columnMode;

      if (THEME_OPTIONS.includes(rawTheme as PrettyTheme)) {
        nextPreference.theme = rawTheme as PrettyTheme;
      }

      if (COLUMN_MODE_OPTIONS.includes(rawColumnMode as PrettyColumnMode)) {
        nextPreference.columnMode = rawColumnMode as PrettyColumnMode;
      }

      if (nextPreference.theme || nextPreference.columnMode) {
        normalized[filePath] = nextPreference;
      }
    }

    return normalized;
  }

  private getActiveMarkdownFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return null;
    }
    return file;
  }

  async openPrettyReader(): Promise<void> {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice("Open a Markdown note before launching Pretty Reader.");
      return;
    }

    const existingLeaf = this.findPrettyReaderLeaf(file.path);
    const leaf = existingLeaf ?? this.app.workspace.getLeaf("tab");

    await leaf.setViewState({
      type: PRETTY_READER_VIEW_TYPE,
      active: true,
      state: {
        file: file.path,
      } as PrettyReaderViewState,
    });

    this.app.workspace.revealLeaf(leaf);
  }

  private findPrettyReaderLeaf(filePath: string): WorkspaceLeaf | null {
    for (const leaf of this.app.workspace.getLeavesOfType(
      PRETTY_READER_VIEW_TYPE,
    )) {
      if (!(leaf.view instanceof PrettyReaderView)) {
        continue;
      }

      if (leaf.view.getState().file === filePath) {
        return leaf;
      }
    }

    return null;
  }

  getNotePreference(filePath: string): PrettyNotePreference {
    return this.settings.notePreferences[filePath] ?? {};
  }

  async setNoteTheme(filePath: string, theme: PrettyTheme): Promise<void> {
    const nextPreference = {
      ...this.getNotePreference(filePath),
      theme,
    };
    await this.setNotePreference(filePath, nextPreference);
  }

  async resetNoteTheme(filePath: string): Promise<void> {
    const nextPreference = {
      ...this.getNotePreference(filePath),
    };
    delete nextPreference.theme;
    await this.setNotePreference(filePath, nextPreference);
  }

  async setNoteColumnMode(
    filePath: string,
    columnMode: PrettyColumnMode,
  ): Promise<void> {
    const nextPreference = {
      ...this.getNotePreference(filePath),
      columnMode,
    };
    await this.setNotePreference(filePath, nextPreference);
  }

  private async setNotePreference(
    filePath: string,
    preference: PrettyNotePreference,
  ): Promise<void> {
    if (preference.theme || preference.columnMode) {
      this.settings.notePreferences[filePath] = preference;
    } else {
      delete this.settings.notePreferences[filePath];
    }

    await this.saveSettings();
  }

  private async handleFileRename(
    oldPath: string,
    newPath: string,
  ): Promise<void> {
    if (oldPath === newPath) {
      return;
    }

    const existingPreference = this.settings.notePreferences[oldPath];
    if (!existingPreference) {
      return;
    }

    delete this.settings.notePreferences[oldPath];
    this.settings.notePreferences[newPath] = existingPreference;
    await this.saveSettings();
  }

  private async handleFileDelete(filePath: string): Promise<void> {
    if (!this.settings.notePreferences[filePath]) {
      return;
    }

    delete this.settings.notePreferences[filePath];
    await this.saveSettings();
  }

  async exportActiveNote(): Promise<void> {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice("Open a Markdown note before exporting Pretty Reader HTML.");
      return;
    }

    const prettyDocument = await buildPrettyReaderDocument(
      this.app,
      file,
      this.settings,
    );

    const result = await exportPrettyReaderHtml({
      app: this.app,
      exportRoot: this.settings.exportDirectory,
      prettyDocument,
    });

    new Notice(`Pretty Reader exported to ${result.outputPath}`);
  }

  async rerenderPrettyReaderLeaves(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(PRETTY_READER_VIEW_TYPE);
    await Promise.all(
      leaves.map(async (leaf) => {
        if (leaf.view instanceof PrettyReaderView) {
          await leaf.view.renderView();
        }
      }),
    );
  }
}

class PrettyReaderSettingTab extends PluginSettingTab {
  plugin: PrettyReaderPlugin;

  constructor(app: App, plugin: PrettyReaderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Pretty Reader" });

    new Setting(containerEl)
      .setName("Default layout")
      .setDesc("Applied when a note does not define pretty in frontmatter.")
      .addDropdown((dropdown) => {
        for (const layout of LAYOUT_OPTIONS) {
          dropdown.addOption(layout, layout);
        }
        dropdown.setValue(this.plugin.settings.defaultLayout);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultLayout = value as PrettyLayout;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Default theme")
      .setDesc("Applied when a note does not define theme in frontmatter.")
      .addDropdown((dropdown) => {
        for (const theme of THEME_OPTIONS) {
          dropdown.addOption(theme, theme);
        }
        dropdown.setValue(this.plugin.settings.defaultTheme);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultTheme = value as PrettyTheme;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Export directory")
      .setDesc("Exported HTML is written beneath the vault root.")
      .addText((text) => {
        text.setPlaceholder(DEFAULT_SETTINGS.exportDirectory);
        text.setValue(this.plugin.settings.exportDirectory);
        text.onChange(async (value) => {
          this.plugin.settings.exportDirectory = normalizePath(
            value || DEFAULT_SETTINGS.exportDirectory,
          );
          await this.plugin.saveSettings();
        });
      });
  }
}
