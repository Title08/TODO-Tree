import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { TodoFileNode, TodoFolderNode, TodoMatch } from "./types";
import { TagGroupNode, buildTagGroupedTree, buildTodoTree, countTodosInFolder } from "./tree";
import type TodoTreePlugin from "./main";

export const TODO_TREE_VIEW_TYPE = "todo-tree-view";

// Tag icons (VSCode style)
const TAG_ICONS: Record<string, string> = {
  TODO: '<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13zm2.9 4.3L7 9.8L5.1 7.9L4 9l3 3l5-5l-1.1-1.2z"/></svg>',
  FIXME: '<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM8 4a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 8 4z"/></svg>',
  BUG: '<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M4.72 3.22a.75.75 0 0 1 1.06 0l1.22 1.22 1.22-1.22a.75.75 0 1 1 1.06 1.06L8.06 5.5l1.22 1.22a.75.75 0 0 1-1.06 1.06L7 6.56 5.78 7.78a.75.75 0 0 1-1.06-1.06L5.94 5.5 4.72 4.28a.75.75 0 0 1 0-1.06zM8 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>',
  HACK: '<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/></svg>'
};

const DEFAULT_ICON = '<svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>';

const FOLDER_ICON = '<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5H7.707l-.854-.854A.5.5 0 0 0 6.5 2.5H1.5z"/></svg>';

const FILE_ICON = '<svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0H4zM9 1v3.5A1.5 1.5 0 0 0 10.5 6H14v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5z"/></svg>';

export class TodoTreeView extends ItemView {
  private readonly plugin: TodoTreePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: TodoTreePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  override getViewType(): string {
    return TODO_TREE_VIEW_TYPE;
  }

  override getDisplayText(): string {
    return "TODO Tree";
  }

  override getIcon(): string {
    return "check-square";
  }

  override async onOpen(): Promise<void> {
    this.addAction("refresh-cw", "Refresh TODO Tree", async () => {
      await this.plugin.refreshAll();
    });
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("todo-tree-view");

    const matches = this.plugin.getAllMatches();
    const total = matches.length;

    // Header
    const header = container.createDiv({ cls: "todo-tree-header" });
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";
    header.createEl("h3", { text: "TODO Tree" }).style.cssText = "margin:0;font-size:14px;";
    const countEl = header.createDiv({ text: `${total}` });
    countEl.style.cssText = "font-size:12px;color:var(--text-muted);";

    if (total === 0) {
      const emptyEl = container.createEl("p", { text: "No TODOs found in markdown notes." });
      emptyEl.style.cssText = "color:var(--text-muted);font-size:13px;";
      return;
    }

    const treeContainer = container.createDiv({ cls: "todo-tree-container" });

    // Check groupBy setting
    if (this.plugin.settings.groupBy === "folder") {
      const folderTree = buildTodoTree(matches);
      this.renderFolderView(treeContainer, folderTree);
    } else {
      const tagGroups = buildTagGroupedTree(matches);
      for (const group of tagGroups) {
        this.renderTagGroup(treeContainer, group);
      }
    }
  }

  private renderTagGroup(parent: HTMLElement, group: TagGroupNode): void {
    const details = parent.createEl("details", { attr: { open: "true" } });
    details.style.cssText = "margin:4px 0;";

    const summary = details.createEl("summary");
    summary.style.cssText = "cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;list-style:none;padding:4px 0;font-weight:600;";

    // Left side: expand icon + tag icon + tag name
    const left = summary.createDiv();
    left.style.cssText = "display:flex;align-items:center;gap:6px;";

    const expandIcon = left.createSpan({ text: "›" });
    expandIcon.style.cssText = "color:var(--text-muted);width:14px;font-size:16px;font-weight:600;transform:rotate(90deg);transition:transform 160ms ease;";

    const iconSpan = left.createSpan();
    iconSpan.style.cssText = "width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-accent);";
    iconSpan.innerHTML = TAG_ICONS[group.tag.toUpperCase()] ?? DEFAULT_ICON;

    const tagName = left.createSpan({ text: group.tag });
    tagName.style.cssText = "font-weight:600;color:var(--text-accent);";

    // Badge
    const badge = summary.createSpan({ text: String(group.todos.length) });
    badge.style.cssText = "font-size:11px;color:var(--text-muted);background:var(--background-modifier-hover);padding:1px 6px;border-radius:10px;";

    // Items list
    const list = details.createDiv();
    list.style.cssText = "padding-left:20px;";

    for (const todo of group.todos) {
      this.renderTodoItem(list, todo);
    }
  }

  private renderTodoItem(parent: HTMLElement, todo: TodoMatch): void {
    const item = parent.createDiv();
    item.style.cssText = "cursor:pointer;padding:3px 4px;border-radius:4px;margin:1px 0;";

    if (todo.isMarkdownTask && todo.markdownTaskState === "done") {
      item.style.cssText += "opacity:0.6;";
    }

    // Row with text and location
    const row = item.createDiv();
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;";

    // Text
    const textSpan = row.createSpan({ text: todo.text || "(no text)" });
    textSpan.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

    if (todo.isMarkdownTask && todo.markdownTaskState === "done") {
      textSpan.style.cssText += "text-decoration:line-through;color:var(--text-faint);";
    }

    // Location
    const location = row.createSpan({ text: `${todo.filePath}:${todo.line}` });
    location.style.cssText = "font-size:11px;color:var(--text-muted);white-space:nowrap;flex-shrink:0;";

    // Hover effect
    item.addEventListener("mouseenter", () => {
      item.style.background = "var(--background-modifier-hover)";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "";
    });

    // Click to navigate
    item.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(todo.filePath);
      if (file instanceof TFile) {
        await this.plugin.openTodo(file, todo);
      }
    });
  }

  // ========== Folder View Methods ==========

  private renderFolderView(parent: HTMLElement, root: TodoFolderNode): void {
    // Render subfolders
    for (const folder of root.folders) {
      this.renderFolderNode(parent, folder);
    }
    // Render files at root level
    for (const file of root.files) {
      this.renderFileNode(parent, file);
    }
  }

  private renderFolderNode(parent: HTMLElement, folder: TodoFolderNode): void {
    const todoCount = countTodosInFolder(folder);
    if (todoCount === 0) return;

    const details = parent.createEl("details", { attr: { open: "true" } });
    details.style.cssText = "margin:4px 0;";

    const summary = details.createEl("summary");
    summary.style.cssText = "cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;list-style:none;padding:4px 0;font-weight:600;";

    // Left side: expand icon + folder icon + name
    const left = summary.createDiv();
    left.style.cssText = "display:flex;align-items:center;gap:6px;";

    const expandIcon = left.createSpan({ text: "›" });
    expandIcon.style.cssText = "color:var(--text-muted);width:14px;font-size:16px;font-weight:600;transform:rotate(90deg);transition:transform 160ms ease;";

    const iconSpan = left.createSpan();
    iconSpan.style.cssText = "width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-accent);";
    iconSpan.innerHTML = FOLDER_ICON;

    const nameSpan = left.createSpan({ text: folder.name });
    nameSpan.style.cssText = "font-weight:600;";

    // Badge
    const badge = summary.createSpan({ text: String(todoCount) });
    badge.style.cssText = "font-size:11px;color:var(--text-muted);background:var(--background-modifier-hover);padding:1px 6px;border-radius:10px;";

    // Content
    const content = details.createDiv();
    content.style.cssText = "padding-left:20px;";

    // Render subfolders
    for (const subFolder of folder.folders) {
      this.renderFolderNode(content, subFolder);
    }

    // Render files
    for (const file of folder.files) {
      this.renderFileNode(content, file);
    }
  }

  private renderFileNode(parent: HTMLElement, file: TodoFileNode): void {
    if (file.todos.length === 0) return;

    const details = parent.createEl("details", { attr: { open: "true" } });
    details.style.cssText = "margin:2px 0;";

    const summary = details.createEl("summary");
    summary.style.cssText = "cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;list-style:none;padding:3px 0;";

    // Left side: expand icon + file icon + name
    const left = summary.createDiv();
    left.style.cssText = "display:flex;align-items:center;gap:6px;";

    const expandIcon = left.createSpan({ text: "›" });
    expandIcon.style.cssText = "color:var(--text-muted);width:14px;font-size:14px;transform:rotate(90deg);transition:transform 160ms ease;";

    const iconSpan = left.createSpan();
    iconSpan.style.cssText = "width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-muted);";
    iconSpan.innerHTML = FILE_ICON;

    const nameSpan = left.createSpan({ text: file.name.replace(/\.md$/, "") });
    nameSpan.style.cssText = "font-size:13px;";

    // Badge
    const badge = summary.createSpan({ text: String(file.todos.length) });
    badge.style.cssText = "font-size:11px;color:var(--text-muted);background:var(--background-modifier-hover);padding:1px 6px;border-radius:10px;";

    // TODOs list
    const list = details.createDiv();
    list.style.cssText = "padding-left:20px;";

    for (const todo of file.todos) {
      this.renderFolderTodoItem(list, todo);
    }
  }

  private renderFolderTodoItem(parent: HTMLElement, todo: TodoMatch): void {
    const item = parent.createDiv();
    item.style.cssText = "cursor:pointer;padding:3px 4px;border-radius:4px;margin:1px 0;";

    if (todo.isMarkdownTask && todo.markdownTaskState === "done") {
      item.style.cssText += "opacity:0.6;";
    }

    // Row with tag + text + line number
    const row = item.createDiv();
    row.style.cssText = "display:flex;align-items:center;gap:8px;font-size:13px;";

    // Tag icon
    const tagIcon = row.createSpan();
    tagIcon.style.cssText = "width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-accent);flex-shrink:0;";
    tagIcon.innerHTML = TAG_ICONS[todo.tag.toUpperCase()] ?? DEFAULT_ICON;

    // Tag name
    const tagSpan = row.createSpan({ text: todo.tag });
    tagSpan.style.cssText = "font-weight:600;color:var(--text-accent);font-size:11px;flex-shrink:0;";

    // Text
    const textSpan = row.createSpan({ text: todo.text || "(no text)" });
    textSpan.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

    if (todo.isMarkdownTask && todo.markdownTaskState === "done") {
      textSpan.style.cssText += "text-decoration:line-through;color:var(--text-faint);";
    }

    // Line number
    const lineNum = row.createSpan({ text: `:${todo.line}` });
    lineNum.style.cssText = "font-size:11px;color:var(--text-muted);flex-shrink:0;";

    // Hover effect
    item.addEventListener("mouseenter", () => {
      item.style.background = "var(--background-modifier-hover)";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "";
    });

    // Click to navigate
    item.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(todo.filePath);
      if (file instanceof TFile) {
        await this.plugin.openTodo(file, todo);
      }
    });
  }
}
