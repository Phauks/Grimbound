# Blood on the Clocktower Token Generator

🌐 **[Launch Web App](https://phauks.github.io/Clocktower_Token_Generator/)**

A web-based tool for generating custom Blood on the Clocktower character and reminder tokens with PDF export. Built with TypeScript for type safety and maintainability.

## Features

- **Token Generation**: Generate character tokens and reminder tokens from custom or official scripts
- **Customizable Appearance**: Adjust token diameters, backgrounds, fonts, and colors
- **PDF Export**: Generate print-ready PDFs at 300 DPI with proper margins
- **ZIP Download**: Download all tokens as a ZIP archive organized by type
- **Filter & Sort**: Filter tokens by team type, token type, or reminder status
- **Curved Text**: Character names and reminder text curve along the bottom of tokens
- **Setup Flower Overlay**: Characters with setup modifications display decorative overlays
- **No Installation Required**: Runs entirely in your browser!

## Usage

Simply visit the link above - no download or installation needed!

## Development

### Prerequisites

- Node.js 18+ and npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Watch Mode (for development)

```bash
npm run watch
```

### Project Structure

```
/src/ts/          # TypeScript source files
/dist/js/         # Compiled JavaScript (gitignored, generated on build)
/assets/          # Fonts, images, backgrounds
/css/             # Stylesheets
/example_scripts/ # Example JSON scripts
```

### Type Safety

This project uses TypeScript with strict type checking enabled. All data structures are properly typed for better IDE support and error prevention.

### Generating Tokens

1. **Input a Script**:
   - Upload a JSON file using the file upload button
   - Paste JSON directly into the editor
   - Select an example script from the dropdown

2. **Configure Options** (Optional):
   - Adjust token diameters for character and reminder tokens
   - Enable ability text display on character tokens
   - Show reminder count badges on character tokens
   - Choose background patterns and setup flower styles
   - Set reminder token background color
   - Select fonts for character names and reminder text

3. **Generate**:
   - Click "Generate Tokens" to create all tokens
   - Tokens appear in a grid view with previews

4. **Export**:
   - Click individual tokens to download as PNG
   - Use "Download All (ZIP)" for batch download
   - Use "Generate PDF" for print-ready output

## JSON Format

### Simple Format (ID References)

```json
[
  { "id": "washerwoman" },
  { "id": "librarian" },
  { "id": "fortune_teller" }
]
```

### Full Format (Custom Characters)

```json
[
  {
    "id": "_meta",
    "name": "My Script",
    "author": "Your Name"
  },
  {
    "id": "custom_char",
    "name": "Custom Character",
    "team": "townsfolk",
    "ability": "You have a custom ability.",
    "image": "https://example.com/image.png",
    "setup": false,
    "reminders": ["Reminder 1", "Reminder 2"]
  }
]
```

### Character Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (required) |
| `name` | string | Display name (required) |
| `team` | string | Team type: townsfolk, outsider, minion, demon, traveller, fabled, loric |
| `ability` | string | Character ability text |
| `image` | string/array | URL to character image |
| `setup` | boolean | Whether character affects game setup |
| `reminders` | array | Array of reminder token strings |

## Configuration Options

### Token Generation

| Option | Default | Description |
|--------|---------|-------------|
| Display Ability Text | OFF | Show ability text on character tokens |
| Character Token Diameter | 300px | Size of character tokens |
| Reminder Token Diameter | 525px | Size of reminder tokens |
| Show Reminder Count | OFF | Display count badge on character tokens |

### Style Options

| Option | Default | Description |
|--------|---------|-------------|
| Setup Flower Style | Setup Flower 1 | Decorative overlay for setup characters |
| Reminder Background | #FFFFFF | Background color for reminder tokens |
| Character Background | Background 1 | Background pattern for character tokens |
| Character Name Font | Dumbledor | Font for character names |
| Reminder Text Font | Trade Gothic | Font for reminder text |

### PDF Generation

| Option | Default | Description |
|--------|---------|-------------|
| Token Padding | 75px | Space between tokens |
| X Offset | 0px | Horizontal offset for token placement |
| Y Offset | 0px | Vertical offset for token placement |

## PDF Specifications

- **Page Size**: 8.5" × 11" (Letter)
- **Resolution**: 300 DPI
- **Margins**: 0.25" on all sides
- **Layout**: Grid (left-to-right, top-to-bottom)

## Browser Support

- Google Chrome (recommended)
- Mozilla Firefox
- Safari
- Microsoft Edge

## Dependencies

External libraries loaded via CDN:
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- [JSZip](https://stuk.github.io/jszip/) - ZIP file creation
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - File downloads

## Credits

- Blood on the Clocktower is a trademark of The Pandemonium Institute
- Character data sourced from the official Blood on the Clocktower API
- Fonts: Dumbledor, Trade Gothic

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## License

See [LICENSE](LICENSE) file for details.

## To Be Implemented (TBI)

The following features are planned but not yet implemented:
- Leaf generation and probability system
- Official vs custom character filtering
- Script name token generation
- Almanac QR code token
- Advanced layout algorithms beyond grid