import { ProjectFile } from './projecfile';
import { EcpPackStage } from './stages/ecp-pack';
import { GowinPackStage } from './stages/gowin-pack';
import { IcePackStage } from './stages/ice-pack';
import { IVerilogTestbenchStage } from './stages/iverilog';
import { NextPnrEcp5Stage, NextPnrGowinStage, NextPnrIce40Stage } from './stages/nextpnr';
import { OpenFPGALoaderExternalFlashStage } from './stages/openfpgaloader-external-flash';
import { OpenFPGALoaderProgramStage } from './stages/openfpgaloader-program';
import { ToolchainStage } from './stages/stage';
import { YosysCSTCheckStage } from './stages/yosys-cst-check';
import { YosysECP5Stage, YosysGowinStage, YosysICE40Stage } from './stages/yosys-synth';
import { CommandOption } from './utils/command-options';
import { boardToToolchain, ToolchainProject } from './utils/device-info';

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

export function getStagesForOption(projectFile: ProjectFile, option: CommandOption): StageClass[] {
    const toolchain = boardToToolchain(projectFile.board);
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



