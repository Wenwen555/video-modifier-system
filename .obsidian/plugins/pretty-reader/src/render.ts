import { App, Component, MarkdownRenderer } from "obsidian";
import { assetExportHref } from "./document";
import { type PrettyHeading, type PrettyReaderDocument } from "./types";

type RenderMode = "view" | "export";

interface RenderPrettyReaderDocumentOptions {
  app: App;
  component: Component;
  containerEl: HTMLElement;
  prettyDocument: PrettyReaderDocument;
  mode: RenderMode;
}

export async function renderPrettyReaderDocument(
  options: RenderPrettyReaderDocumentOptions,
): Promise<void> {
  const { app, component, containerEl, prettyDocument, mode } = options;
  containerEl.empty();

  const root = containerEl.createDiv({
    cls: [
      "pretty-reader",
      `pretty-reader--${prettyDocument.layout}`,
      `pretty-reader-theme--${prettyDocument.theme}`,
    ].join(" "),
  });

  if (prettyDocument.cover) {
    root.addClass("has-cover");
  }

  const shell = root.createDiv({ cls: "pretty-reader-shell" });
  renderHeader(app, shell, prettyDocument, mode);

  const body = shell.createDiv({ cls: "pretty-reader-body" });
  const content = body.createDiv({ cls: "pretty-reader-content" });

  const renderedHeadings =
    prettyDocument.layout === "cards"
      ? await renderCards(app, content, component, prettyDocument, mode)
      : await renderMarkdownBlock(
          app,
          content,
          component,
          mode === "export"
            ? prettyDocument.exportMarkdown
            : prettyDocument.displayMarkdown,
          prettyDocument.filePath,
        );

  if (prettyDocument.toc && renderedHeadings.length > 0) {
    body.addClass("has-toc");
    const toc = createToc(renderedHeadings, body, mode);
    body.appendChild(toc);
  }
}

function renderHeader(
  app: App,
  containerEl: HTMLElement,
  prettyDocument: PrettyReaderDocument,
  mode: RenderMode,
): void {
  const coverUrl = getCoverUrl(app, prettyDocument, mode);
  const header = containerEl.createDiv({ cls: "pretty-reader-header" });
  const main = header.createDiv({ cls: "pretty-reader-header-main" });

  if (coverUrl) {
    const cover = main.createDiv({ cls: "pretty-reader-cover" });
    cover.createEl("img", {
      attr: {
        alt: `${prettyDocument.title} cover`,
        src: coverUrl,
      },
    });
  }

  const intro = main.createDiv({ cls: "pretty-reader-intro" });
  const eyebrowRow = intro.createDiv({ cls: "pretty-reader-eyebrow-row" });
  eyebrowRow.createEl("p", {
    cls: "pretty-reader-eyebrow",
    text: prettyDocument.layout,
  });
  eyebrowRow.createSpan({
    cls: "pretty-reader-divider-dot",
    text: "|",
  });
  eyebrowRow.createSpan({
    cls: "pretty-reader-updated",
    text: `Updated ${prettyDocument.updatedLabel}`,
  });

  intro.createEl("h1", {
    cls: "pretty-reader-title",
    text: prettyDocument.title,
  });

  if (prettyDocument.subtitle) {
    intro.createEl("p", {
      cls: "pretty-reader-subtitle",
      text: prettyDocument.subtitle,
    });
  }

  const meta = intro.createDiv({ cls: "pretty-reader-meta" });

  if (prettyDocument.author) {
    meta.createSpan({
      cls: "pretty-reader-meta-pill",
      text: prettyDocument.author,
    });
  }

  const summaryBar = intro.createDiv({ cls: "pretty-reader-summary-bar" });
  renderSummaryItem(summaryBar, "Read", `${prettyDocument.readingMinutes} min`);
  renderSummaryItem(
    summaryBar,
    "Words",
    prettyDocument.wordCount.toLocaleString("zh-CN"),
  );
  renderSummaryItem(summaryBar, "Theme", prettyDocument.theme);
  renderSummaryItem(summaryBar, "File", prettyDocument.file.basename);
}

async function renderCards(
  app: App,
  containerEl: HTMLElement,
  component: Component,
  prettyDocument: PrettyReaderDocument,
  mode: RenderMode,
): Promise<PrettyHeading[]> {
  const cardsGrid = containerEl.createDiv({ cls: "pretty-reader-cards-grid" });
  const cards = mode === "export" ? prettyDocument.exportCards : prettyDocument.cards;

  for (const card of cards) {
    const cardEl = cardsGrid.createDiv({ cls: "pretty-reader-card" });
    await renderMarkdownBlock(
      app,
      cardEl,
      component,
      card.markdown,
      prettyDocument.filePath,
    );
  }

  return assignHeadingAnchors(cardsGrid);
}

async function renderMarkdownBlock(
  app: App,
  containerEl: HTMLElement,
  component: Component,
  markdown: string,
  sourcePath: string,
): Promise<PrettyHeading[]> {
  containerEl.addClass("pretty-reader-prose", "markdown-rendered");
  await MarkdownRenderer.render(app, markdown, containerEl, sourcePath, component);
  enrichRichBlocks(containerEl);
  return assignHeadingAnchors(containerEl);
}

function assignHeadingAnchors(containerEl: HTMLElement): PrettyHeading[] {
  const headings: PrettyHeading[] = [];
  const seen = new Map<string, number>();
  const headingEls = containerEl.querySelectorAll<HTMLElement>(
    "h1, h2, h3, h4, h5, h6",
  );

  for (const headingEl of headingEls) {
    const text = headingEl.innerText.trim();
    if (!text) {
      continue;
    }

    const base = slugifyHeading(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    const anchor = count === 0 ? base : `${base}-${count + 1}`;
    headingEl.id = anchor;

    headings.push({
      level: Number(headingEl.tagName.slice(1)),
      text,
      anchor,
    });
  }

  return headings;
}

function createToc(
  headings: PrettyHeading[],
  bodyEl: HTMLElement,
  mode: RenderMode,
): HTMLElement {
  const toc = document.createElement("aside");
  toc.className = "pretty-reader-toc";

  const title = document.createElement("h2");
  title.className = "pretty-reader-toc-title";
  title.textContent = "On this page";
  toc.appendChild(title);

  const list = document.createElement("ul");
  list.className = "pretty-reader-toc-list";

  for (const heading of headings) {
    const item = document.createElement("li");
    item.className = `pretty-reader-toc-item level-${heading.level}`;

    const link = document.createElement("a");
    link.href = `#${heading.anchor}`;
    link.textContent = heading.text;

    if (mode === "view") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const target = bodyEl.querySelector<HTMLElement>(`#${heading.anchor}`);
        target?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    item.appendChild(link);
    list.appendChild(item);
  }

  toc.appendChild(list);
  return toc;
}

function getCoverUrl(
  app: App,
  prettyDocument: PrettyReaderDocument,
  mode: RenderMode,
): string | null {
  const cover = prettyDocument.cover;
  if (!cover) {
    return null;
  }

  if (cover.isExternal) {
    return cover.externalUrl ?? null;
  }

  if (!cover.resolvedFile) {
    return null;
  }

  if (mode === "view") {
    return app.vault.getResourcePath(cover.resolvedFile);
  }

  return assetExportHref(cover);
}

function renderSummaryItem(
  containerEl: HTMLElement,
  label: string,
  value: string,
): void {
  const item = containerEl.createDiv({ cls: "pretty-reader-summary-item" });
  item.createSpan({
    cls: "pretty-reader-summary-label",
    text: label,
  });
  item.createSpan({
    cls: "pretty-reader-summary-value",
    text: value,
  });
}

function enrichRichBlocks(containerEl: HTMLElement): void {
  for (const blockquote of containerEl.querySelectorAll("blockquote")) {
    blockquote.addClass("pretty-reader-quote-block");
  }

  for (const callout of containerEl.querySelectorAll(".callout")) {
    callout.addClass("pretty-reader-callout");
  }

  for (const mathBlock of containerEl.querySelectorAll(
    ".math.math-block, mjx-container[display='true']",
  )) {
    (mathBlock as HTMLElement).addClass("pretty-reader-math-block");
  }

  for (const footnotes of containerEl.querySelectorAll(".footnotes")) {
    footnotes.addClass("pretty-reader-footnotes");
  }
}

function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
