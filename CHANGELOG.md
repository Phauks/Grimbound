# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning Strategy

This project uses Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward-compatible manner  
- **PATCH** version for backward-compatible bug fixes and minor updates

**Current Phase:** Pre-1.0 development (0.x.x)
- Version increments with each significant commit/update
- Patch version (last digit) increments for each commit with changes

## [Unreleased]

### Added
- Trademark/credit token: Automatic token generation for Blood on the Clocktower attribution
  - Displays trademark text: "Blood on the Clocktower is a product of the Pandemonium Institute"
  - Generated automatically with every token set
  - Uses same styling as other character tokens
  - Filename: `botc_trademark.png`
  - Includes placeholder for future Pandemonium Institute logo (marked TBI)

## [0.1.0] - 2025-01-25

### Added
- Initial release of Blood on the Clocktower Token Generator
- Token generation from JSON scripts (custom and official BotC characters)
- Character and reminder token creation with customizable styling
- PDF export functionality at 300 DPI
- ZIP download for batch token export
- Customizable token diameters, backgrounds, fonts, and colors
- Setup flower overlay system for setup characters
- Curved text rendering for character names and reminders
- Filter and sort tokens by team, type, and reminder status
- Responsive UI with collapsible options panel
- Example scripts (Uncertain Death, Fall of Rome)
- GitHub repository link in header
- Version number display in header

### Technical
- TypeScript implementation with strict type checking
- Client-side rendering (no backend required)
- Support for CORS-restricted external images with graceful fallback
- CDN-based dependencies (jsPDF, JSZip, FileSaver.js)

[Unreleased]: https://github.com/Phauks/Clocktower_Token_Generator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Phauks/Clocktower_Token_Generator/releases/tag/v0.1.0
