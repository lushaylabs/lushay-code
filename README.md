# Lushay Code README

This is the README for the Lushay Code extensions for VSCode.

## Features

This extension automates the execution of the open source FPGA toolchain. 
This project is a wrapper around OSS-CAD-Suite which does the heavy lifting of providing all the prebuilt binaries for the OS toolchain.

## Requirements

To use this plugin you have to have OSS-CAD-Suite on your computer. For linux and mac you just need to extract the zip for your OS to anywhere on your computer
For windows you download an executable which will extract the data for you.
OSS-CAD-Suite can be downloaded from [here](https://github.com/YosysHQ/oss-cad-suite-build/releases)

There is also a link from within the extension which will appear once running the extension.

## Getting Started
To get started you need to open a new folder and have at least 1 verilog file (`.v`) and 1 constraints file (`.cst`). With these two files created you can press the "FPGA Toolchain" button on the right side of the bottom bar.

If you have not yet linked OSS-Cad-Suite you will get a popup message with a button where you can link the oss-cad-suite folder. Simply select the extracted folder called oss-cad-suite and then you can reclick on the "FPGA Toolchain" button.

Once setup clicking this button will open a dropdown with multiple options like building the project, programming the FPGA device and so-on.

By default all verilog files in the current project except those ending with `_tb.v` (which are considered test benches) will be built and you should have a top module called `top`.

If you have a testbench file you will also get an option to run the testbench. The testbench top module needs to be called `test`.

## Configuration
You can override the default behaviour of the extension by creating a file called `<name>.lushay.json` for example `demo.lushay.json` with overrides for all the settings. The name can be whatever you want and it will be used as the default output name so in this example if I would compile the code I would get a file called `demo.fs`.

The type of the configuration file is as follows:
```
export interface ProjectFile {
	name: string;
	includedFiles: string[] | 'all';
	externalFlashFiles: string[];
	top: string;
    constraintsFile: string;
	programMode: 'flash' | 'ram';
	testBenches: string[] | 'all';
	nextPnrGowinOptions: string[];
	synthGowinOptions: string[];
}
```

All fields are option and have default values as detailed below

| Key | Description | Default |
| ------------- | ------------- | ------------- |
| name  | Overrides the project name | Either the project file's name or the folder name |
| includedFiles | The verilog files to synthesize | all which means all non testbench verilog files you can also specify file paths relative to the project file |
| externalFlashFiles | Binary files to flash to the external flash | [] |
| top | The name of the top module for synthesis | top |
| constraintsFile | Path to constraints file relative to project file | finds first constraint file in directory |
| programMode | Whether to program to flash or ram | flash |
| testBenches | Paths to test benches relative to project file | all which means all `_tb.v` files |
| nextPnrGowinOptions | Extra flags for the nextpnr-gowin stage | [] |
| synthGowinOptions | Extra flags for the synth-gowin stage in yosys | [] |


## Extension Settings

This extension contributes the following settings:

* `lushay.OssCadSuite.path`: You need to set this to the path of OSS-CAD-Suite on your computer

## Release Notes

### 1.0.0

Initial release of Lushay Code Plugin

**Enjoy!**
