import { TodoFileNode, TodoFolderNode, TodoMatch } from "./types";

function createFolderNode(name: string, path: string): TodoFolderNode {
  return {
    name,
    path,
    folders: [],
    files: []
  };
}

function getOrCreateFolder(
  parent: TodoFolderNode,
  folderName: string,
  folderPath: string
): TodoFolderNode {
  const existing = parent.folders.find((folder) => folder.path === folderPath);
  if (existing !== undefined) {
    return existing;
  }

  const created = createFolderNode(folderName, folderPath);
  parent.folders.push(created);
  parent.folders.sort((left, right) => left.name.localeCompare(right.name));
  return created;
}

export function buildTodoTree(matches: TodoMatch[]): TodoFolderNode {
  const root = createFolderNode("Vault", "");
  const byFile = new Map<string, TodoMatch[]>();

  for (const match of matches) {
    const fileMatches = byFile.get(match.filePath);
    if (fileMatches === undefined) {
      byFile.set(match.filePath, [match]);
    } else {
      fileMatches.push(match);
    }
  }

  const sortedPaths = Array.from(byFile.keys()).sort((left, right) =>
    left.localeCompare(right)
  );

  for (const filePath of sortedPaths) {
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1];
    const folderParts = parts.slice(0, -1);
    let currentFolder = root;

    for (let i = 0; i < folderParts.length; i += 1) {
      const folderName = folderParts[i];
      const folderPath = folderParts.slice(0, i + 1).join("/");
      currentFolder = getOrCreateFolder(currentFolder, folderName, folderPath);
    }

    const todos = byFile.get(filePath) ?? [];
    todos.sort((left, right) => {
      if (left.line !== right.line) {
        return left.line - right.line;
      }
      return left.column - right.column;
    });

    const fileNode: TodoFileNode = {
      name: fileName,
      path: filePath,
      todos
    };

    currentFolder.files.push(fileNode);
    currentFolder.files.sort((left, right) => left.name.localeCompare(right.name));
  }

  return root;
}

export function countTodosInFolder(folder: TodoFolderNode): number {
  let total = 0;

  for (const file of folder.files) {
    total += file.todos.length;
  }

  for (const childFolder of folder.folders) {
    total += countTodosInFolder(childFolder);
  }

  return total;
}

