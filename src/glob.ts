function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function toRegExpPattern(glob: string): string {
  let pattern = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      pattern += ".*";
      i += 1;
      continue;
    }

    if (char === "*") {
      pattern += "[^/]*";
      continue;
    }

    if (char === "?") {
      pattern += "[^/]";
      continue;
    }

    pattern += escapeRegExp(char);
  }
  return `^${pattern}$`;
}

function normalizeGlob(glob: string): string {
  const trimmed = glob.trim();
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

export function matchGlob(path: string, glob: string): boolean {
  if (!glob.trim()) {
    return false;
  }

  const normalizedGlob = normalizeGlob(glob);
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const regex = new RegExp(toRegExpPattern(normalizedGlob));
  return regex.test(normalizedPath);
}

export function matchAnyGlob(path: string, globs: string[]): boolean {
  return globs.some((glob) => matchGlob(path, glob));
}

