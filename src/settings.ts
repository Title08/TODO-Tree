import {
  App,
  PluginSettingTab,
  Setting,
  TextAreaComponent
} from "obsidian";
import type TodoTreePlugin from "./main";
import { DEFAULT_SETTINGS, TodoTreeSettings } from "./types";

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyCsv(values: string[]): string {
  return values.join(", ");
}

function parseLineList(textArea: TextAreaComponent): string[] {
  return textArea
    .getValue()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export class TodoTreeSettingTab extends PluginSettingTab {
  private readonly plugin: TodoTreePlugin;

  constructor(app: App, plugin: TodoTreePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "TODO Tree settings" });

    new Setting(containerEl)
      .setName("Tags")
      .setDesc("Comma-separated tags, e.g. TODO, FIXME, BUG, HACK")
      .addText((text) =>
        text
          .setPlaceholder("TODO, FIXME, BUG, HACK")
          .setValue(stringifyCsv(this.plugin.settings.tags))
          .onChange(async (value) => {
            const parsed = parseCsv(value);
            const nextTags = parsed.length > 0 ? parsed : DEFAULT_SETTINGS.tags;
            await this.plugin.updateSettings({ tags: nextTags });
          })
      );

    new Setting(containerEl)
      .setName("Regex")
      .setDesc("Use $TAGS placeholder where tags should be matched.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.regex)
          .setValue(this.plugin.settings.regex)
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              regex: value.trim() || DEFAULT_SETTINGS.regex
            });
          })
      );

    new Setting(containerEl)
      .setName("Case-sensitive regex")
      .setDesc("If disabled, tags and regex matching are case-insensitive.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.regexCaseSensitive)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ regexCaseSensitive: value });
          })
      );

    new Setting(containerEl)
      .setName("Include markdown task list items")
      .setDesc("Include lines like '- [ ] task' in addition to tagged TODO lines.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeMarkdownTasks)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ includeMarkdownTasks: value });
          })
      );

    new Setting(containerEl)
      .setName("Show completed markdown tasks")
      .setDesc("When markdown tasks are enabled, also show completed items like '- [x] done'.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showCompletedMarkdownTasks)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ showCompletedMarkdownTasks: value });
          })
      );

    new Setting(containerEl)
      .setName("Auto refresh")
      .setDesc("Refresh tree when markdown files change in the vault.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRefresh)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ autoRefresh: value });
          })
      );

    new Setting(containerEl)
      .setName("Include globs")
      .setDesc("Optional: one glob per line. If set, only matching files are scanned.")
      .addTextArea((text) => {
        text
          .setPlaceholder("Projects/**/*.md")
          .setValue(this.plugin.settings.includeGlobs.join("\n"))
          .onChange(async () => {
            await this.plugin.updateSettings({
              includeGlobs: parseLineList(text)
            });
          });
        text.inputEl.rows = 4;
      });

    new Setting(containerEl)
      .setName("Exclude globs")
      .setDesc("Optional: one glob per line. Matching files are ignored.")
      .addTextArea((text) => {
        text
          .setPlaceholder("Templates/**")
          .setValue(this.plugin.settings.excludeGlobs.join("\n"))
          .onChange(async () => {
            await this.plugin.updateSettings({
              excludeGlobs: parseLineList(text)
            });
          });
        text.inputEl.rows = 4;
      });
  }
}

export function mergeSettings(
  saved: Partial<TodoTreeSettings>
): TodoTreeSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    tags: Array.isArray(saved.tags) && saved.tags.length > 0 ? saved.tags : DEFAULT_SETTINGS.tags,
    includeGlobs: Array.isArray(saved.includeGlobs) ? saved.includeGlobs : DEFAULT_SETTINGS.includeGlobs,
    excludeGlobs: Array.isArray(saved.excludeGlobs) ? saved.excludeGlobs : DEFAULT_SETTINGS.excludeGlobs
  };
}
