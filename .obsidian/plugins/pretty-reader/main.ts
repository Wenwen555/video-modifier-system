import {
  App,
  ItemView,
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
  DEFAULT_SETTINGS,
  LAYOUT_OPTIONS,
  PRETTY_READER_VIEW_TYPE,
  THEME_OPTIONS,
  type PrettyLayout,
  type PrettyReaderSettings,
  type PrettyReaderViewState,
  type PrettyTheme,
} from "./src/types";

class PrettyReaderView extends ItemView {
  plugin: PrettyReaderPlugin;
  private state: PrettyReaderViewState = {};

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
      return `${abstractFile.basename} · Pretty Reader`;
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
    const emptyState = this.contentEl.createDiv({
      cls: "pretty-reader-empty-state",
    });
    emptyState.createEl("h2", { text: "Pretty Reader" });
    emptyState.createEl("p", { text: message });
  }
}

export default class PrettyReaderPlugin extends Plugin {
  settings: PrettyReaderSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

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
    };
  }

  async saveSettings(): Promise<void> {
    this.settings.exportDirectory = normalizeExportDirectory(
      this.settings.exportDirectory,
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
