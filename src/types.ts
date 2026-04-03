export type GroupBy = "tag" | "folder";

export interface TodoTreeSettings {
  tags: string[];
  regex: string;
  regexCaseSensitive: boolean;
  includeMarkdownTasks: boolean;
  showCompletedMarkdownTasks: boolean;
  includeGlobs: string[];
  excludeGlobs: string[];
  autoRefresh: boolean;
  groupBy: GroupBy;
}

export type MarkdownTaskState = "open" | "done";

export interface TodoMatch {
  filePath: string;
  line: number;
  column: number;
  tag: string;
  text: string;
  rawLine: string;
  isMarkdownTask: boolean;
  markdownTaskState?: MarkdownTaskState;
}

export interface TodoFileNode {
  name: string;
  path: string;
  todos: TodoMatch[];
}

export interface TodoFolderNode {
  name: string;
  path: string;
  folders: TodoFolderNode[];
  files: TodoFileNode[];
}

export const DEFAULT_SETTINGS: TodoTreeSettings = {
  tags: ["TODO", "FIXME", "BUG", "HACK"],
  regex: "\\b($TAGS)\\b[:\\-\\s]*(.*)$",
  regexCaseSensitive: false,
  includeMarkdownTasks: false,
  showCompletedMarkdownTasks: true,
  includeGlobs: [],
  excludeGlobs: [],
  autoRefresh: true,
  groupBy: "tag"
};
