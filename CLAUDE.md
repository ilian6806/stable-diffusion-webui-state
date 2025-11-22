# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Stable Diffusion WebUI extension that preserves UI parameters (inputs, sliders, checkboxes, etc.) after page reload. It uses localStorage for persistence and supports multiple SD extensions (ControlNet, ADetailer, Dynamic Prompting, Multidiffusion/Tiled VAE).

## Development

**No build system** - This is a pure extension with vanilla JavaScript and Python. Files are loaded directly by the parent Stable Diffusion WebUI.

- Modify JavaScript/Python files directly
- Reload the webui to test changes
- Place extension in parent webui's `extensions/` directory

## Architecture

### Frontend (JavaScript)

```
state.app.js          → Entry point, calls state.core.init() on DOMContentLoaded
state.core.js         → Main module: element mappings, initialization, UI buttons
state.store.js        → LocalStorage wrapper with 'state-' prefix
state.utils.js        → DOM manipulation, event handling, file operations
state.constants.js    → Constants (LS_PREFIX)
state.loggings.js     → Console logging utilities
state.ext.*.js        → Extension-specific handlers (ControlNet, ADetailer, etc.)
```

**Key patterns:**
- IIFE modules prevent global namespace pollution
- All code lives under `window.state` namespace (`state.core`, `state.store`, `state.utils`, `state.extensions`)
- Extension plugins register via `state.extensions[name] = { init: function() {} }`

### Backend (Python)

```
scripts/state_api.py      → FastAPI endpoint: GET /state/config.json
scripts/state_settings.py → Gradio settings UI (checkbox groups for element preservation)
```

### Data Flow

1. `state.core.init()` fetches `/state/config.json` from Python backend
2. Config specifies which elements to preserve per tab (txt2img, img2img)
3. Event listeners attached to elements → changes saved to localStorage
4. On page load, values restored from localStorage to elements

### Element Categories in state.core.js

- `INPUTS`: Text inputs, textareas, sliders (prompt, steps, seed, etc.)
- `SELECTS`: Dropdowns (sampling, scheduler, upscaler, etc.)
- `MULTI_SELECTS`: Multi-select dropdowns (styles)
- `TOGGLE_BUTTONS`: Accordion toggles (hires_fix, refiner, tiled_diffusion)

## Adding Support for New UI Elements

1. Add element mapping in `state.core.js` (INPUTS, SELECTS, etc.)
2. Implement or reuse handler function (`handleSavedInput`, `handleSavedSelects`, etc.)
3. Add checkbox option in `state_settings.py`

## Adding Support for New Extensions

1. Create `javascript/state.ext.{name}.js`
2. Implement IIFE module returning `{ init }` function
3. Register in `state_settings.py` as checkbox option
4. Reference `state.ext.control-net.js` for implementation pattern

## Git Workflow

- Feature branches from `develop`
- PRs target `develop` branch
- Main branch: `main`
