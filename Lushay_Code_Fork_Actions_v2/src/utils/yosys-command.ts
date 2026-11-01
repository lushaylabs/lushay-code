import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import type { ProjectFile } from '../projecfile';

export function isVhdlFile(file: string): boolean {
    return /\.vhdl?$/i.test(file);
}

export function isSynthesisFile(file: string): boolean {
    return /\.(v|vhd|vhdl)$/i.test(file) && !/_tb\.(v|vhd|vhdl)$/i.test(file);
}

export function usesVhdl(project: ProjectFile): boolean {
    return project.includedFilePaths.some(isVhdlFile);
}

// These are Yosys command-language arguments, not shell arguments.
export function quoteYosysArgument(value: string): string {
    if (/[\r\n\0]/.test(value)) {
        throw new Error('Yosys arguments cannot contain line breaks or NUL characters');
    }
    return '"' + value.replace(/\\/g, '/').replace(/"/g, '\\"') + '"';
}

function synthesisTop(project: ProjectFile): string {
    const top = project.top || 'top';
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(top)) {
        throw new Error('Use a basic HDL identifier for the top module/entity name');
    }
    return top;
}

function quoteTclArgument(value: string): string {
    if (/[\r\n\0]/.test(value)) {
        throw new Error('GHDL arguments cannot contain line breaks or NUL characters');
    }
    return '"' + value.replace(/[\\"$\[\]]/g, '\\$&') + '"';
}

export interface PreparedYosysCommand {
    command: string[];
    dispose(): void;
}

/** Shared by synthesis, pin checking and the visual constraints editor. */
export function createYosysCommand(
    project: ProjectFile,
    executable: string,
    commands: (top: string) => string[]
): PreparedYosysCommand {
    const top = synthesisTop(project);
    const vhdl = usesVhdl(project);
    const files = project.includedFilePaths.map(quoteYosysArgument).join(' ');
    if (!vhdl) {
        return {
            command: [executable, '-p', [`read_verilog ${files}`, ...commands(top)].join('; ')],
            dispose() { /* No temporary script is needed for the Verilog frontend. */ }
        };
    }
    if (!project.includedFilePaths.every(isVhdlFile)) {
        throw new Error('Mixed VHDL/Verilog projects are not supported by this VHDL synthesis integration');
    }
    const options = project.ghdlOptions ?? ['--std=08'];
    if (!Array.isArray(options) || !options.every(option => typeof option === 'string')) {
        throw new Error('ghdlOptions must be an array of command arguments');
    }
    const plugin = project.ghdlPlugin ?? 'ghdl';
    if (typeof plugin !== 'string') {
        throw new Error('ghdlPlugin must be a plugin name or path (empty for a built-in frontend)');
    }
    const pluginArgs: string[] = [];
    if (plugin) {
        const pluginPath = /[/\\]/.test(plugin) ? path.resolve(project.basePath, plugin) : plugin;
        pluginArgs.push('-m', pluginPath);
    }
    // The GHDL pass receives literal quotes from the Yosys script parser.
    // Tcl passes an argument vector instead, so source paths may contain spaces.
    const ghdlArgs = [...options, ...project.includedFilePaths, '-e', top];
    const script = [
        `yosys ghdl ${ghdlArgs.map(quoteTclArgument).join(' ')}`,
        // GHDL may preserve declaration casing or mangle generic entity names.
        `yosys rename -top ${quoteTclArgument(top)}`,
        ...commands(top).map(command => `yosys ${quoteTclArgument(command)}`)
    ].join('\n') + '\n';
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lushay-ghdl-'));
    const scriptPath = path.join(directory, 'frontend.tcl');
    try {
        fs.writeFileSync(scriptPath, script, { mode: 0o600 });
    } catch (error) {
        fs.rmSync(directory, { recursive: true, force: true });
        throw error;
    }
    return {
        command: [executable, ...pluginArgs, '-c', scriptPath],
        dispose() { fs.rmSync(directory, { recursive: true, force: true }); }
    };
}

/** Preserve actual vector indices, including ports such as data(7 downto 4). */
export function portsFromYosysLine(line: string): string[] {
    const match = line.match(/^\s*(input|output|inout) \[([0-9]+):([0-9]+)\] (.+?)\s*$/);
    if (!match) {
        return [];
    }
    const first = +match[2];
    const last = +match[3];
    const name = match[4].replace(/^\\/, '');
    if (first === 0 && last === 0) {
        return [name];
    }
    const ports: string[] = [];
    for (let i = Math.min(first, last); i <= Math.max(first, last); i++) {
        ports.push(`${name}[${i}]`);
    }
    return ports;
}
