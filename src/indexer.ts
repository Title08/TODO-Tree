import { App, TAbstractFile, TFile, Vault } from "obsidian";
import { matchAnyGlob } from "./glob";
import { TodoParser } from "./parser";
import { TodoMatch, TodoTreeSettings } from "./types";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function includePath(path: string, settings: TodoTreeSettings): boolean {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath.toLowerCase().endsWith(".md")) {
    return false;
  }

  if (settings.includeGlobs.length > 0) {
    const included = matchAnyGlob(normalizedPath, settings.includeGlobs);
    if (!included) {
      return false;
    }
  }

  if (settings.excludeGlobs.length > 0) {
    const excluded = matchAnyGlob(normalizedPath, settings.excludeGlobs);
    if (excluded) {
      return false;
    }
  }

  return true;
}

async function listMarkdownFiles(vault: Vault): Promise<TFile[]> {
  return vault.getMarkdownFiles();
}

export class TodoIndexer {
  private readonly app: App;
  private settings: TodoTreeSettings;
  private parser: TodoParser;
  private readonly matchesByFile = new Map<string, TodoMatch[]>();

  constructor(app: App, settings: TodoTreeSettings) {
    this.app = app;
    this.settings = settings;
    this.parser = new TodoParser(settings);
  }

  setSettings(settings: TodoTreeSettings): void {
    this.settings = settings;
    this.parser = new TodoParser(settings);
  }

  async reindexAll(): Promise<TodoMatch[]> {
    this.matchesByFile.clear();
    const files = await listMarkdownFiles(this.app.vault);

    for (const file of files) {
      await this.reindexFile(file);
    }

    return this.getAllMatches();
  }

  async reindexFile(file: TFile): Promise<void> {
    const filePath = normalizePath(file.path);
    if (!includePath(filePath, this.settings)) {
      this.matchesByFile.delete(filePath);
      return;
    }

    const content = await this.app.vault.cachedRead(file);
    const matches = this.parser.parseContent(filePath, content);
    if (matches.length === 0) {
      this.matchesByFile.delete(filePath);
      return;
    }

    this.matchesByFile.set(filePath, matches);
  }

  onFileDeleted(file: TAbstractFile): void {
    if (file instanceof TFile) {
      this.matchesByFile.delete(normalizePath(file.path));
    }
  }

  onFileRenamed(file: TAbstractFile, oldPath: string): void {
    if (!(file instanceof TFile)) {
      return;
    }

    this.matchesByFile.delete(normalizePath(oldPath));
  }

  getAllMatches(): TodoMatch[] {
    return Array.from(this.matchesByFile.values()).flat();
  }
}

