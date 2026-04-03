import { TodoMatch, TodoTreeSettings } from "./types";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTagRegexSource(tag: string): string {
  const escaped = escapeRegex(tag);
  return /^\w+$/.test(tag) ? `\\b${escaped}\\b` : escaped;
}

export class TodoParser {
  private readonly searchRegex: RegExp;
  private readonly tags: string[];
  private readonly tagRegex: RegExp;
  private readonly includeMarkdownTasks: boolean;
  private readonly showCompletedMarkdownTasks: boolean;
  private readonly regexCaseSensitive: boolean;

  constructor(settings: TodoTreeSettings) {
    if (settings.tags.length === 0) {
      throw new Error("At least one TODO tag must be configured.");
    }

    this.tags = settings.tags;
    this.includeMarkdownTasks = settings.includeMarkdownTasks;
    this.showCompletedMarkdownTasks = settings.showCompletedMarkdownTasks;
    this.regexCaseSensitive = settings.regexCaseSensitive;

    const tagsPattern = settings.tags.map(escapeRegex).join("|");
    const regexSource = settings.regex.replace(/\$TAGS/g, `(?:${tagsPattern})`);
    const searchFlags = settings.regexCaseSensitive ? "" : "i";
    this.searchRegex = new RegExp(regexSource, searchFlags);

    const tagPattern = settings.tags
      .slice()
      .sort((left, right) => right.length - left.length)
      .map(buildTagRegexSource)
      .join("|");
    this.tagRegex = new RegExp(
      `(${tagPattern})`,
      settings.regexCaseSensitive ? "" : "i"
    );
  }

  parseContent(filePath: string, content: string): TodoMatch[] {
    const matches: TodoMatch[] = [];
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const lineNumber = index + 1;

      const tagMatch = this.parseTagLine(filePath, rawLine, lineNumber);
      if (tagMatch !== null) {
        matches.push(tagMatch);
        continue;
      }

      if (this.includeMarkdownTasks) {
        const taskMatch = this.parseMarkdownTaskLine(filePath, rawLine, lineNumber);
        if (taskMatch !== null) {
          matches.push(taskMatch);
        }
      }
    }

    return matches;
  }

  private parseTagLine(
    filePath: string,
    rawLine: string,
    lineNumber: number
  ): TodoMatch | null {
    const regexResult = this.searchRegex.exec(rawLine);
    if (regexResult === null) {
      return null;
    }

    const tagResult = this.tagRegex.exec(rawLine);
    if (tagResult === null) {
      return null;
    }

    const foundTag = tagResult[1];
    const column = tagResult.index + 1;
    const text = rawLine
      .slice(tagResult.index + foundTag.length)
      .replace(/^[:\-\s]+/, "")
      .trim();

    return {
      filePath,
      line: lineNumber,
      column,
      tag: this.normalizeTag(foundTag),
      text,
      rawLine,
      isMarkdownTask: false
    };
  }

  private parseMarkdownTaskLine(
    filePath: string,
    rawLine: string,
    lineNumber: number
  ): TodoMatch | null {
    const taskRegex = /^\s*(?:[-*+]|\d+\.)\s+\[([ xX])\]\s*(.*)$/;
    const taskResult = taskRegex.exec(rawLine);
    if (taskResult === null) {
      return null;
    }

    const isDone = taskResult[1].toLowerCase() === "x";
    if (isDone && !this.showCompletedMarkdownTasks) {
      return null;
    }

    const taskMarker = isDone ? "[x]" : "[ ]";
    const taskMarkerIndex = rawLine.toLowerCase().indexOf(taskMarker);
    if (taskMarkerIndex < 0) {
      return null;
    }

    return {
      filePath,
      line: lineNumber,
      column: taskMarkerIndex + 1,
      tag: isDone ? "[x]" : "[ ]",
      text: taskResult[2].trim(),
      rawLine,
      isMarkdownTask: true,
      markdownTaskState: isDone ? "done" : "open"
    };
  }

  private normalizeTag(tag: string): string {
    if (this.regexCaseSensitive) {
      return tag;
    }

    const lower = tag.toLowerCase();
    const configuredTag = this.tags.find(
      (candidate) => candidate.toLowerCase() === lower
    );
    return configuredTag ?? tag;
  }
}
