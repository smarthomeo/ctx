export interface TechStack {
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  testFramework?: string;
  linter?: string;
  runtime?: string;
  typeChecker?: string;
}

export interface EnvVar {
  name: string;
  defaultValue?: string;
  comment?: string;
  required: boolean;
}

export interface Command {
  name: string;
  description: string;
  source: 'package.json' | 'Makefile' | 'pyproject.toml' | 'go' | 'other';
  command: string;
}

export interface Convention {
  name: string;
  description: string;
  evidence?: string;
}

export interface ArchitectureInfo {
  entryPoints: string[];
  keyModules: string[];
  dataFlow: string;
}

export interface ProjectContext {
  projectName: string;
  overview: string;
  techStack: TechStack;
  structure: {
    tree: string;
    files: string[];
    directories: string[];
    keyFiles: string[];
  };
  conventions: Convention[];
  environment: EnvVar[];
  commands: Command[];
  architecture: ArchitectureInfo;
  generatedAt: string;
  rootPath: string;
}

export interface ScanOptions {
  rootPath: string;
  depth: number;
  ignorePatterns: string[];
  outputPath: string;
  format: 'md' | 'json';
}

export interface ContextDiff {
  hasChanges: boolean;
  changedSections: string[];
  addedFiles: string[];
  removedFiles: string[];
  modifiedFiles: string[];
  details: Record<string, { before: unknown; after: unknown }>;
}
