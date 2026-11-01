import * as path from 'path';

/** An explicit binary directory also supports MSYS2 and independently installed tools. */
export function resolveToolchainBinPath(externalBinPath?: string, suitePath?: string): string | undefined {
    if (externalBinPath?.trim()) {
        return path.resolve(externalBinPath.trim());
    }
    if (!suitePath?.trim()) {
        return undefined;
    }
    const root = path.resolve(suitePath.trim());
    return path.basename(root).toLowerCase() === 'bin' ? root : path.join(root, 'bin');
}

/** Keep SystemRoot, TEMP, GHDL_PREFIX and the rest of the host environment. */
export function toolchainEnvironment(
    binPath: string,
    inherited: NodeJS.ProcessEnv = process.env,
    platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv {
    const paths = platform === 'win32' ? path.win32 : path;
    const separator = platform === 'win32' ? ';' : ':';
    const root = paths.resolve(binPath, '..');
    const environment = { ...inherited };
    const keys = Object.keys(environment).filter(key => platform === 'win32' ? key.toLowerCase() === 'path' : key === 'PATH');
    const inheritedPath = keys.map(key => environment[key]).filter(Boolean).join(separator);
    for (const key of keys) {
        delete environment[key];
    }
    environment.PATH = [binPath, paths.join(root, 'lib'), paths.join(root, 'py3bin'), inheritedPath].filter(Boolean).join(separator);
    return environment;
}
