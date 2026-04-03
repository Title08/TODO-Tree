import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginManifest,
  TAbstractFile,
  TFile
} from "obsidian";
import { TodoIndexer } from "./indexer";
import { TodoTreeSettingTab, mergeSettings } from "./settings";
import { buildTodoTree } from "./tree";
import { TodoFolderNode, TodoMatch, TodoTreeSettings } from "./types";
import { TODO_TREE_VIEW_TYPE, TodoTreeView } from "./view";

function debounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => Promise<void>,
  waitMs: number
): (...args: TArgs) => void {
  let timeoutId: number | null = null;

  return (...args: TArgs) => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      void callback(...args);
    }, waitMs);
  };
}

export default class TodoTreePlugin extends Plugin {
  settings!: TodoTreeSettings;
  private indexer!: TodoIndexer;
  private treeRoot: TodoFolderNode = {
    name: "Vault",
    path: "",
    folders: [],
    files: []
  };

  private readonly debouncedRefresh = debounce(async () => {
    await this.refreshAll();
  }, 200);

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  override async onload(): Promise<void> {
    await this.loadPluginSettings();

    this.indexer = new TodoIndexer(this.app, this.settings);

    this.registerView(
      TODO_TREE_VIEW_TYPE,
      (leaf) => new TodoTreeView(leaf, this)
    );

    this.addRibbonIcon("check-square", "Open TODO Tree", async () => {
      await this.activateView();
    });

    this.addCommand({
      id: "open-todo-tree",
      name: "Open TODO Tree view",
      callback: async () => {
        await this.activateView();
      }
    });

    this.addCommand({
      id: "refresh-todo-tree",
      name: "Refresh TODO Tree",
      callback: async () => {
        await this.refreshAll();
        new Notice("TODO Tree refreshed.");
      }
    });

    this.registerEvent(
      this.app.vault.on("modify", async (file: TAbstractFile) => {
        if (!this.settings.autoRefresh || !(file instanceof TFile)) {
          return;
        }

        await this.indexer.reindexFile(file);
        this.debouncedRefresh();
      })
    );

    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (!this.settings.autoRefresh || !(file instanceof TFile)) {
          return;
        }

        await this.indexer.reindexFile(file);
        this.debouncedRefresh();
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (!this.settings.autoRefresh) {
          return;
        }

        this.indexer.onFileDeleted(file);
        this.debouncedRefresh();
      })
    );

    this.registerEvent(
      this.app.vault.on(
        "rename",
        async (file: TAbstractFile, oldPath: string) => {
          if (!this.settings.autoRefresh || !(file instanceof TFile)) {
            return;
          }

          this.indexer.onFileRenamed(file, oldPath);
          await this.indexer.reindexFile(file);
          this.debouncedRefresh();
        }
      )
    );

    this.addSettingTab(new TodoTreeSettingTab(this.app, this));

    await this.refreshAll();
    await this.activateView();
  }

  override async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(TODO_TREE_VIEW_TYPE);
  }

  async updateSettings(next: Partial<TodoTreeSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...next
    };
    await this.saveData(this.settings);

    this.indexer.setSettings(this.settings);
    await this.refreshAll();
  }

  getTreeRoot(): TodoFolderNode {
    return this.treeRoot;
  }

  getAllMatches(): TodoMatch[] {
    return this.indexer.getAllMatches();
  }

  async refreshAll(): Promise<void> {
    await this.indexer.reindexAll();
    this.treeRoot = buildTodoTree(this.indexer.getAllMatches());
    this.refreshView();
  }

  async openTodo(file: TFile, todo: TodoMatch): Promise<void> {
    const existingLeaf = this.app.workspace
      .getLeavesOfType("markdown")
      .find((leaf) => {
        const view = leaf.view;
        return view instanceof MarkdownView && view.file?.path === file.path;
      });

    const leaf = existingLeaf ?? this.app.workspace.getLeaf(true);
    if (existingLeaf === undefined) {
      await leaf.openFile(file);
    }

    await this.app.workspace.revealLeaf(leaf);
    const view = leaf.view;
    if (view instanceof MarkdownView) {
      const line = Math.max(todo.line - 1, 0);
      const ch = Math.max(todo.column - 1, 0);
      view.editor.setCursor({ line, ch });
      view.editor.scrollIntoView({ from: { line, ch }, to: { line, ch } }, true);
    }
  }

  private async loadPluginSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<TodoTreeSettings> | null;
    this.settings = mergeSettings(loaded ?? {});
  }

  private refreshView(): void {
    const leaves = this.app.workspace.getLeavesOfType(TODO_TREE_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof TodoTreeView) {
        void view.refresh();
      }
    }
  }

  private async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(TODO_TREE_VIEW_TYPE);
    if (leaves.length > 0) {
      await this.app.workspace.revealLeaf(leaves[0]);
      return;
    }

    const leaf = this.app.workspace.getLeftLeaf(false);
    if (leaf === null) {
      return;
    }

    await leaf.setViewState({
      type: TODO_TREE_VIEW_TYPE,
      active: true
    });
    await this.app.workspace.revealLeaf(leaf);
  }
}
