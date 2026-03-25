export const REQUIRED_PUBLISH_FILES: string[];

export function ensureRequiredBundleInputs(repoRoot: string): Promise<void>;

export function writeChecksumFile(
  outputDir: string,
  archivePaths: string[],
  archiveBaseName: string
): Promise<string>;

export function createZipArchive(
  parentDir: string,
  bundleDirName: string,
  zipPath: string,
  options?: {
    execFileImpl?: (
      file: string,
      args: string[],
      options?: { cwd?: string }
    ) => Promise<unknown>;
    stderr?: {
      write: (chunk: string) => boolean;
    };
  }
): Promise<boolean>;