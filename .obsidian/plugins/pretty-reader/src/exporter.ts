import { App, Component, normalizePath } from "obsidian";
import { ensureFolder, noteSlug } from "./document";
import { renderPrettyReaderDocument } from "./render";
import { type PrettyReaderDocument } from "./types";

interface ExportPrettyReaderHtmlOptions {
  app: App;
  exportRoot: string;
  prettyDocument: PrettyReaderDocument;
}

interface ExportPrettyReaderHtmlResult {
  outputPath: string;
}

const EXTRA_EXPORT_CSS = `
body {
  margin: 0;
  background: #f4efe4;
}

img {
  max-width: 100%;
}
`;

export async function exportPrettyReaderHtml(
  options: ExportPrettyReaderHtmlOptions,
): Promise<ExportPrettyReaderHtmlResult> {
  const { app, exportRoot, prettyDocument } = options;
  const slug = noteSlug(prettyDocument.filePath);
  const outputPath = normalizePath(`${exportRoot}/${slug}`);
  const assetsPath = normalizePath(`${outputPath}/assets`);

  await ensureFolder(app, assetsPath);
  await copyLocalAssets(app, prettyDocument.resources, assetsPath);

  const tempComponent = new Component();
  const tempContainer = document.createElement("div");

  await renderPrettyReaderDocument({
    app,
    component: tempComponent,
    containerEl: tempContainer,
    prettyDocument,
    mode: "export",
  });

  await waitForRichRender();
  const styles = await loadPluginStyles(app);
  const html = buildHtmlDocument(prettyDocument.title, tempContainer.innerHTML, styles);
  await app.vault.adapter.write(normalizePath(`${outputPath}/index.html`), html);
  tempComponent.unload();

  return {
    outputPath: normalizePath(`${outputPath}/index.html`),
  };
}

async function copyLocalAssets(
  app: App,
  resources: PrettyReaderDocument["resources"],
  assetsPath: string,
): Promise<void> {
  const copied = new Set<string>();

  for (const resource of resources) {
    if (resource.isExternal || !resource.resolvedPath || !resource.assetFileName) {
      continue;
    }

    if (copied.has(resource.resolvedPath)) {
      continue;
    }

    const binary = await app.vault.adapter.readBinary(resource.resolvedPath);
    await app.vault.adapter.writeBinary(
      normalizePath(`${assetsPath}/${resource.assetFileName}`),
      binary,
    );
    copied.add(resource.resolvedPath);
  }
}

async function loadPluginStyles(app: App): Promise<string> {
  const pluginStylesPath = ".obsidian/plugins/pretty-reader/styles.css";
  const stylesheet = await app.vault.adapter.read(pluginStylesPath);
  const runtimeStyles = loadRuntimeMathStyles();
  return `${stylesheet}\n${runtimeStyles}\n${EXTRA_EXPORT_CSS}`;
}

function buildHtmlDocument(title: string, bodyMarkup: string, styles: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
${styles}
    </style>
  </head>
  <body class="pretty-reader-export">
${bodyMarkup}
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function waitForRichRender(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 50);
  });
}

function loadRuntimeMathStyles(): string {
  const styleEls = Array.from(
    document.querySelectorAll<HTMLStyleElement>(
      "#MJX-CHTML-styles, style[id^='MJX-']",
    ),
  );

  return styleEls.map((styleEl) => styleEl.textContent ?? "").join("\n");
}
