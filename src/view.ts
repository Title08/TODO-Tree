import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { TodoFolderNode, TodoMatch } from "./types";
import { countTodosInFolder } from "./tree";
import type TodoTreePlugin from "./main";

export const TODO_TREE_VIEW_TYPE = "todo-tree-view";
const EXPAND_ICON_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5-1.4-1.4L8.2 8 4.6 4.4 6 3z"></path></svg>';
const TODO_CIRCLE_CHECK_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13zm2.9 4.3L7 9.8L5.1 7.9L4 9l3 3l5-5l-1.1-1.2z"></path></svg>';

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

    const root = this.plugin.getTreeRoot();
    const total = countTodosInFolder(root);

    const header = container.createDiv({ cls: "todo-tree-header" });
    header.createEl("h3", { text: "TODO Tree" });
    header.createDiv({ cls: "todo-tree-count", text: `${total}` });

    if (total === 0) {
      container.createEl("p", {
        cls: "todo-tree-empty",
        text: "No TODOs found in markdown notes."
      });
      return;
    }

    const treeContainer = container.createDiv({ cls: "todo-tree-container" });
    this.renderFolder(treeContainer, root, true);
  }

  private renderFolder(
    parent: HTMLElement,
    folder: TodoFolderNode,
    isRoot = false
  ): void {
    const folderCount = countTodosInFolder(folder);
    if (!isRoot) {
      const folderDetails = parent.createEl("details", {
        cls: "todo-tree-folder",
        attr: { open: "true" }
      });
      const summary = folderDetails.createEl("summary");
      const left = summary.createDiv({ cls: "todo-tree-row-left" });
      const expand = left.createSpan({ cls: "todo-tree-expand-icon" });
      expand.innerHTML = EXPAND_ICON_SVG;
      left.createSpan({ cls: "todo-tree-folder-name", text: folder.name });
      summary.createSpan({
        cls: "todo-tree-badge",
        text: String(folderCount)
      });
      parent = folderDetails.createDiv({ cls: "todo-tree-folder-content" });
    }

    for (const childFolder of folder.folders) {
      this.renderFolder(parent, childFolder);
    }

    for (const file of folder.files) {
      const fileDetails = parent.createEl("details", {
        cls: "todo-tree-file",
        attr: { open: "true" }
      });
      const summary = fileDetails.createEl("summary");
      const left = summary.createDiv({ cls: "todo-tree-row-left" });
      const expand = left.createSpan({ cls: "todo-tree-expand-icon" });
      expand.innerHTML = EXPAND_ICON_SVG;
      left.createSpan({ cls: "todo-tree-file-name", text: file.name });
      summary.createSpan({
        cls: "todo-tree-badge",
        text: String(file.todos.length)
      });

      const list = fileDetails.createDiv({ cls: "todo-tree-items" });
      for (const todo of file.todos) {
        this.renderTodoItem(list, todo);
      }
    }
  }

  private renderTodoItem(parent: HTMLElement, todo: TodoMatch): void {
    const item = parent.createDiv({
      cls: `todo-tree-item ${
        todo.isMarkdownTask && todo.markdownTaskState === "done"
          ? "todo-tree-item-done"
          : ""
      }`
    });
    const title = item.createDiv({ cls: "todo-tree-item-title" });
    if (todo.isMarkdownTask) {
      const taskIcon = todo.markdownTaskState === "done" ? "☑" : "☐";
      title.createSpan({ cls: "todo-tree-checkbox-icon", text: taskIcon });
    } else if (todo.tag.toUpperCase() === "TODO") {
      const todoIcon = title.createSpan({
        cls: "todo-tree-checkbox-icon todo-tree-todo-check-icon"
      });
      todoIcon.innerHTML = TODO_CIRCLE_CHECK_SVG;
    } else {
      title.createSpan({ cls: "todo-tree-checkbox-icon", text: "•" });
    }
    title.createSpan({ cls: "todo-tree-tag", text: todo.tag });
    title.createSpan({ text: todo.text || "(no text)" });

    item.createDiv({
      cls: "todo-tree-item-meta",
      text: `${todo.filePath}:${todo.line}`
    });

    item.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(todo.filePath);
      if (file instanceof TFile) {
        await this.plugin.openTodo(file, todo);
      }
    });
  }
}
