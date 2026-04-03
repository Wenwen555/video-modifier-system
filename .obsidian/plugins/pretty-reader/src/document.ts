import { App, TFile, normalizePath } from "obsidian";
import {
  LAYOUT_OPTIONS,
  THEME_OPTIONS,
  type PrettyCardSection,
  type PrettyHeading,
  type PrettyLayout,
  type PrettyReaderDocument,
  type PrettyReaderSettings,
  type PrettyResolvedResource,
  type PrettyResourceKind,
  type PrettyTheme,
} from "./types";

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

interface ParsedHeading {
  level: number;
  text: string;
}

export async function buildPrettyReaderDocument(
  app: App,
  file: TFile,
  settings: PrettyReaderSettings,
): Promise<PrettyReaderDocument> {
  const rawMarkdown = await app.vault.cachedRead(file);
  const contentWithoutFrontmatter = stripFrontmatter(rawMarkdown).trim();
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const leadingTitleHeading = extractFirstLevelOneHeading(contentWithoutFrontmatter);
  const displayMarkdown = stripLeadingTitleHeading(
    contentWithoutFrontmatter,
    leadingTitleHeading?.text,
  ).trim();

  const title =
    readString(frontmatter.title) ??
    leadingTitleHeading?.text ??
    file.basename;

  const subtitle = readString(frontmatter.subtitle);
  const author = readString(frontmatter.author);
  const layout = parseLayout(frontmatter.pretty, settings.defaultLayout);
  const theme = parseTheme(frontmatter.theme, settings.defaultTheme);
  const toc = parseBoolean(frontmatter.toc, false);
  const coverReference = readString(frontmatter.cover);
  const cover = coverReference
    ? resolveResourceReference(app, file, coverReference, "cover") ?? undefined
    : undefined;

  const resources = collectResources(app, file, displayMarkdown, cover);
  const exportMarkdown = rewriteMarkdownForExport(
    app,
    file,
    displayMarkdown,
    resources,
  );
  const headings = assignAnchors(extractHeadings(displayMarkdown));
  const cards = splitMarkdownIntoCards(displayMarkdown);
  const exportCards = splitMarkdownIntoCards(exportMarkdown);
  const wordCount = estimateReadableUnits(displayMarkdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 320));
  const updatedLabel = formatUpdatedAt(file.stat.mtime);

  return {
    file,
    filePath: file.path,
    title,
    subtitle: subtitle ?? undefined,
    author: author ?? undefined,
    layout,
    theme,
    toc,
    wordCount,
    readingMinutes,
    updatedLabel,
    rawMarkdown,
    displayMarkdown,
    exportMarkdown,
    headings,
    cards,
    exportCards,
    cover,
    resources,
  };
}

export function normalizeExportDirectory(input: string): string {
  const trimmed = input.trim().replace(/^\/+/, "");
  return normalizePath(trimmed || "exports/pretty-reader");
}

export function noteSlug(filePath: string): string {
  const cleanPath = filePath.replace(/\\/g, "/");
  const baseName = cleanPath.split("/").pop() ?? cleanPath;
  const stem = baseName.replace(/\.[^.]+$/, "");
  const readable = toAsciiSlug(stem) || "note";
  const hash = Buffer.from(cleanPath, "utf8").toString("base64url").slice(0, 8);
  return `${readable}-${hash}`;
}

export function assetExportHref(resource: PrettyResolvedResource): string | null {
  if (resource.isExternal) {
    return resource.externalUrl ?? null;
  }

  if (!resource.assetFileName) {
    return null;
  }

  return `./assets/${encodeURIComponent(resource.assetFileName)}`;
}

export async function ensureFolder(app: App, folderPath: string): Promise<void> {
  const normalized = normalizePath(folderPath);
  const segments = normalized.split("/").filter(Boolean);
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const exists = await app.vault.adapter.exists(currentPath);
    if (!exists) {
      await app.vault.adapter.mkdir(currentPath);
    }
  }
}

function collectResources(
  app: App,
  file: TFile,
  markdown: string,
  cover?: PrettyResolvedResource,
): PrettyResolvedResource[] {
  const resources = new Map<string, PrettyResolvedResource>();

  const addResource = (resource?: PrettyResolvedResource | null): void => {
    if (!resource) {
      return;
    }

    const key = resource.resolvedPath
      ? `local:${resource.resolvedPath}`
      : `external:${resource.reference}`;

    if (resources.has(key)) {
      return;
    }

    if (!resource.isExternal && resource.resolvedPath) {
      resource.assetFileName = makeAssetFileName(resource.resolvedPath);
    }

    resources.set(key, resource);
  };

  addResource(cover);

  for (const reference of extractImageReferences(markdown)) {
    addResource(resolveResourceReference(app, file, reference, "image"));
  }

  return Array.from(resources.values());
}

function rewriteMarkdownForExport(
  app: App,
  file: TFile,
  markdown: string,
  resources: PrettyResolvedResource[],
): string {
  const resourceByPath = new Map(
    resources
      .filter((resource) => resource.resolvedPath)
      .map((resource) => [resource.resolvedPath as string, resource]),
  );

  const resolveExportTarget = (reference: string): string | null => {
    if (isExternalUrl(reference)) {
      return reference;
    }

    const resolved = resolveResourceReference(app, file, reference, "image");
    if (!resolved) {
      return null;
    }

    if (resolved.isExternal) {
      return resolved.externalUrl ?? null;
    }

    if (!resolved.resolvedPath) {
      return null;
    }

    const existing = resourceByPath.get(resolved.resolvedPath) ?? resolved;
    return assetExportHref(existing);
  };

  let output = markdown.replace(/!\[\[([^\]]+)\]\]/g, (_match, inner) => {
    const { target } = parseWikiTarget(inner);
    const exportTarget = resolveExportTarget(target);
    const altText = target.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "image";
    if (exportTarget) {
      return `![${altText}](${exportTarget})`;
    }
    return `*Missing image: ${altText}*`;
  });

  output = output.replace(/\[\[([^\]]+)\]\]/g, (_match, inner) => {
    const { target, alias } = parseWikiTarget(inner);
    return alias || target.split("#")[0];
  });

  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, target) => {
    const parsedTarget = parseMarkdownTarget(target);
    if (isExternalUrl(parsedTarget)) {
      return match;
    }

    const exportTarget = resolveExportTarget(parsedTarget);
    if (!exportTarget) {
      return alt || "Missing image";
    }

    return `![${alt}](${exportTarget})`;
  });

  output = output.replace(
    /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (match, text, target) => {
      const parsedTarget = parseMarkdownTarget(target);
      if (isExternalUrl(parsedTarget) || parsedTarget.startsWith("#")) {
        return match;
      }

      return text;
    },
  );

  return output;
}

function parseLayout(value: unknown, fallback: PrettyLayout): PrettyLayout {
  return LAYOUT_OPTIONS.includes(value as PrettyLayout)
    ? (value as PrettyLayout)
    : fallback;
}

function parseTheme(value: unknown, fallback: PrettyTheme): PrettyTheme {
  return THEME_OPTIONS.includes(value as PrettyTheme)
    ? (value as PrettyTheme)
    : fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function extractFirstLevelOneHeading(markdown: string): ParsedHeading | null {
  return extractHeadings(markdown).find((heading) => heading.level === 1) ?? null;
}

function stripLeadingTitleHeading(markdown: string, title?: string): string {
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  const output: string[] = [];
  let removedTitle = false;
  let seenMeaningfulContent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
    }

    if (
      !removedTitle &&
      !inFence &&
      !seenMeaningfulContent &&
      trimmed.length > 0 &&
      /^#\s+/.test(trimmed)
    ) {
      const headingText = trimmed.replace(/^#\s+/, "").trim();
      if (!title || headingText === title) {
        removedTitle = true;
        continue;
      }
    }

    if (removedTitle && output.length === 0 && trimmed === "") {
      continue;
    }

    output.push(line);

    if (trimmed.length > 0) {
      seenMeaningfulContent = true;
    }
  }

  return output.join("\n");
}

function extractHeadings(markdown: string): ParsedHeading[] {
  const lines = markdown.split(/\r?\n/);
  const headings: ParsedHeading[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const match = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) {
      continue;
    }

    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  return headings;
}

function assignAnchors(headings: ParsedHeading[]): PrettyHeading[] {
  const seen = new Map<string, number>();

  return headings.map((heading) => {
    const base = toAsciiSlug(heading.text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    return {
      level: heading.level,
      text: heading.text,
      anchor: count === 0 ? base : `${base}-${count + 1}`,
    };
  });
}

function splitMarkdownIntoCards(markdown: string): PrettyCardSection[] {
  if (hasHeadingLevel(markdown, 2)) {
    return splitByHeadingLevel(markdown, 2)
      .map((section) => ({ markdown: section.trim() }))
      .filter((section) => section.markdown.length > 0);
  }

  return splitByBlankLines(markdown)
    .map((section) => ({ markdown: section.trim() }))
    .filter((section) => section.markdown.length > 0);
}

function hasHeadingLevel(markdown: string, level: number): boolean {
  const lines = markdown.split(/\r?\n/);
  const marker = "#".repeat(level);
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }

    if (!inFence && trimmed.startsWith(`${marker} `)) {
      return true;
    }
  }

  return false;
}

function splitByHeadingLevel(markdown: string, level: number): string[] {
  const lines = markdown.split(/\r?\n/);
  const sections: string[] = [];
  const marker = "#".repeat(level);
  let current: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
    }

    if (!inFence && trimmed.startsWith(`${marker} `) && current.length > 0) {
      sections.push(current.join("\n"));
      current = [];
    }

    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections.filter((section) => section.trim().length > 0);
}

function splitByBlankLines(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const sections: string[] = [];
  let current: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
    }

    if (!inFence && trimmed === "" && current.length > 0) {
      sections.push(current.join("\n"));
      current = [];
      continue;
    }

    if (trimmed === "" && current.length === 0) {
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections;
}

function extractImageReferences(markdown: string): string[] {
  const references: string[] = [];

  markdown.replace(/!\[\[([^\]]+)\]\]/g, (_match, inner) => {
    references.push(parseWikiTarget(inner).target);
    return "";
  });

  markdown.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_match, target) => {
    references.push(parseMarkdownTarget(target));
    return "";
  });

  return references;
}

function resolveResourceReference(
  app: App,
  file: TFile,
  reference: string,
  kind: PrettyResourceKind,
): PrettyResolvedResource | null {
  const cleanedReference = reference.trim();
  if (!cleanedReference) {
    return null;
  }

  if (isExternalUrl(cleanedReference)) {
    return {
      kind,
      reference: cleanedReference,
      isExternal: true,
      externalUrl: cleanedReference,
    };
  }

  const wikiTarget = parseWikiTarget(cleanedReference).target;
  const markdownTarget = parseMarkdownTarget(wikiTarget);
  const target = markdownTarget.split("?")[0];
  const resolved =
    app.metadataCache.getFirstLinkpathDest(target, file.path) ??
    resolveViaRelativePath(app, file, target);

  if (!(resolved instanceof TFile)) {
    return null;
  }

  if (!hasImageExtension(resolved.path)) {
    return null;
  }

  return {
    kind,
    reference: cleanedReference,
    isExternal: false,
    resolvedFile: resolved,
    resolvedPath: resolved.path,
  };
}

function resolveViaRelativePath(
  app: App,
  file: TFile,
  reference: string,
): TFile | null {
  const normalized = reference.startsWith("/")
    ? normalizePath(reference.slice(1))
    : normalizePath(`${parentPath(file.path)}/${reference}`);
  const abstractFile = app.vault.getAbstractFileByPath(normalized);
  return abstractFile instanceof TFile ? abstractFile : null;
}

function parseWikiTarget(raw: string): { target: string; alias?: string } {
  const [targetPart, aliasPart] = raw.split("|");
  return {
    target: (targetPart ?? "").split("#")[0].trim(),
    alias: aliasPart?.trim() || undefined,
  };
}

function parseMarkdownTarget(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1);
  }

  const titleMatch = trimmed.match(/^(.+?)(?:\s+"[^"]*")$/);
  return (titleMatch?.[1] ?? trimmed).trim();
}

function hasImageExtension(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.has(ext);
}

function isExternalUrl(value: string): boolean {
  return /^(https?:\/\/|data:)/i.test(value);
}

function parentPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");
  segments.pop();
  return segments.join("/");
}

function makeAssetFileName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const baseName = normalized.split("/").pop() ?? "asset";
  const stem = baseName.replace(/\.[^.]+$/, "");
  const ext = baseName.includes(".") ? `.${baseName.split(".").pop()}` : "";
  const readable = toAsciiSlug(stem) || "asset";
  const hash = Buffer.from(normalized, "utf8").toString("base64url").slice(0, 8);
  return `${readable}-${hash}${ext.toLowerCase()}`;
}

function toAsciiSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function estimateReadableUnits(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/!\[\[[^\]]+\]\]/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, " $1 ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[#>*_\-\n\r]/g, " ")
    .trim();

  const hanCount = (stripped.match(/[\p{Script=Han}]/gu) ?? []).length;
  const latinWordCount = (stripped.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [])
    .length;

  return Math.max(1, hanCount + latinWordCount);
}

function formatUpdatedAt(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}
