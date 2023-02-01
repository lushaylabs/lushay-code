# Change Log

## [0.0.13]

### Added
- Verilog Linting thanks to verilator

### Changed
- Fix to UART tx/rx `DRIVE` setting ([PR #1](https://github.com/lushaylabs/lushay-code/pull/1))

## [0.0.12]

### Changed
- Fix for port checking, was missing inout ports
- Fix for port selection on windows

## [0.0.11]

### Added
- Added option to choose port name from top module

## [0.0.10]

### Added
- Added pre-build stage to make sure all ports are defined in CST file
- Added project file option to skip this pre-build stage (`skipCstChecking`)

## [0.0.9]

### Added
- Colored output for toolchain output
- Ability to select project file in the bottom bar
- Added instruction for usb setup on ubuntu

### Changed
- Fix for openFPGALoader bin not cased correctly
- updated project file schema to include completions for `nextPnrGowinOptions` and `synthGowinOptions` 
- Fix to comment type in constraints file generation
- Fix to path variable on Mac and linux

## [0.0.8]

### Added
- Added constraints editor for .cst files

## [0.0.7]

### Changed
- Fix to add board to project file schema

## [0.0.6]

### Added
- Added support for more tangnano boards

### Changed
- Updates to Serial console, added auto-reconnect and better messages

## [0.0.5]

### Changed
- Fixes to Serial Console

## [0.0.4]

### Changed
- Updates to README

## [0.0.3]

### Added
- Iverilog Support
- Support for no projectfile
- Way to supply nextpnr / synth_gowin parameters from project file
- New Open terminal command to open a terminal with oss-cad-suite loaded

### Changed
- Removed mandatory fields in projectfile providing defaults for all

## [0.0.2]

### Changed
- Fix to constraints file in projectfile
- Changed key for constraints file

## [0.0.1]
- First release