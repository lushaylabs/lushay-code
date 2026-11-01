import { ProjectFile } from './projecfile';
import { EcpPackStage } from './stages/ecp-pack';
import { GowinPackStage } from './stages/gowin-pack';
import { IcePackStage } from './stages/ice-pack';
import { IVerilogTestbenchStage } from './stages/iverilog';
import { SendToServerStage, YosysGowinPrepareProjectStage } from './stages/lushay-cloud-stages';
import { NextPnrEcp5Stage, NextPnrGowinStage, NextPnrIce40Stage } from './stages/nextpnr';
import { OpenFPGALoaderExternalFlashStage } from './stages/openfpgaloader-external-flash';
import { OpenFPGALoaderProgramStage } from './stages/openfpgaloader-program';
import { ToolchainStage } from './stages/stage';
import { YosysCSTCheckStage } from './stages/yosys-cst-check';
import { YosysECP5Stage, YosysGowinStage, YosysICE40Stage } from './stages/yosys-synth';
import { CommandOption } from './utils/command-options';
import { boardToToolchain, ToolchainProject } from './utils/device-info';
import { isVhdlFile, usesVhdl } from './utils/yosys-command';

type StageClass = new (projectFile: ProjectFile) => ToolchainStage;

export function getBuildStagesForToolchain(toolchain: ToolchainProject): StageClass[] {
    if (toolchain === ToolchainProject.APICULA) {
        return [
            YosysGowinStage,
            NextPnrGowinStage,
            GowinPackStage
        ];
    }
    if (toolchain === ToolchainProject.ICESTORM) {
        return [
            YosysICE40Stage,
            NextPnrIce40Stage,
            IcePackStage
        ];
    }
    if (toolchain === ToolchainProject.TRELIS) {
        return [
            YosysECP5Stage,
            NextPnrEcp5Stage,
            EcpPackStage
        ];
    }
    throw new Error('Unknown toolchain');
}

export function getStagesForOption(projectFile: ProjectFile, option: CommandOption, toolchainSource: 'open-source' | 'cloud'): StageClass[] {
    const building = option === CommandOption.BUILD_ONLY || option === CommandOption.BUILD_AND_PROGRAM;
    if (usesVhdl(projectFile)) {
        if (building && !projectFile.includedFilePaths.every(isVhdlFile)) {
            throw new Error('Mixed VHDL/Verilog synthesis is not supported yet. Select one source language in includedFiles.');
        }
        if (building && toolchainSource === 'cloud') {
            throw new Error('VHDL synthesis requires the local open-source toolchain; cloud builds are not supported by this integration.');
        }
        if (option === CommandOption.RUN_TESTBENCH) {
            throw new Error('Run Testbench currently uses iVerilog and does not support VHDL projects. Use GHDL to run VHDL testbenches.');
        }
    }
    if (option === CommandOption.RUN_TESTBENCH && isVhdlFile(projectFile.testBenchPath)) {
        throw new Error('VHDL testbenches must be run with GHDL; iVerilog accepts Verilog testbenches only.');
    }
    const toolchain = boardToToolchain(projectFile.board);
    if (toolchain == ToolchainProject.APICULA && toolchainSource === 'cloud') {
        if (option === CommandOption.BUILD_ONLY) {
            return [
                ...(projectFile.skipCstChecking ? [] : [YosysCSTCheckStage]),
                YosysGowinPrepareProjectStage,
                SendToServerStage
            ]
        }
        if (option === CommandOption.BUILD_AND_PROGRAM) {
            return [
                ...(projectFile.skipCstChecking ? [] : [YosysCSTCheckStage]),
                YosysGowinPrepareProjectStage,
                SendToServerStage,
                OpenFPGALoaderProgramStage
            ];
        }
    }
    if (option === CommandOption.BUILD_ONLY) {
        return [
            ...(projectFile.skipCstChecking ? [] : [YosysCSTCheckStage]),
            ...getBuildStagesForToolchain(toolchain)
        ];
    }
    if (option === CommandOption.BUILD_AND_PROGRAM) {
        return [
            ...(projectFile.skipCstChecking ? [] : [YosysCSTCheckStage]),
            ...getBuildStagesForToolchain(toolchain),
            OpenFPGALoaderProgramStage
        ];
    }
    if (option === CommandOption.PROGRAM_ONLY) {
        return [OpenFPGALoaderProgramStage];
    }

    if (option === CommandOption.EXTERNAL_FLASH) {
        return [OpenFPGALoaderExternalFlashStage];
    }

    if (option === CommandOption.RUN_TESTBENCH) {
        return [IVerilogTestbenchStage];
    }
    return [];
}
