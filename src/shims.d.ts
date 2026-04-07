declare module "node:fs" {
  export const readFileSync: any;
  export const existsSync: any;
}

declare module "node:fs/promises" {
  export const copyFile: any;
  export const mkdir: any;
  export const readFile: any;
  export const writeFile: any;
}

declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:readline" {
  const readline: any;
  export default readline;
}

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd: () => string;
  execPath: string;
  exit: (code?: number) => never;
  stdin: any;
  stdout: {
    write: (chunk: string) => void;
  };
  stderr: {
    write: (chunk: string) => void;
  };
};
