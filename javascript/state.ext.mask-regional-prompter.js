/**
 * State Extension - Mask Regional Prompter Support
 * Saves and restores state for sd-webui-mask-regional-prompter
 */
window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;

state.extensions['mask-regional-prompter'] = (function () {

    const TABS = ['t2i', 'i2i'];

    // Elements to save/restore for each tab
    const ELEMENTS = {
        // Dimensions
        'width': { selector: '#mrp_width_{tab} input', type: 'number' },
        'height': { selector: '#mrp_height_{tab} input', type: 'number' },

        // Tool settings
        'brush_size': { selector: '#mrp_brush_size_{tab} input', type: 'number' },
        'zoom_level': { selector: '#mrp_zoom_level_{tab} input', type: 'number' },
        'layer_opacity': { selector: '#mrp_layer_opacity_{tab} input', type: 'number' },

        // Prompts
        'base_prompt': { selector: '#mrp_base_prompt_{tab} textarea', type: 'text' },
        'base_neg_prompt': { selector: '#mrp_base_neg_prompt_{tab} textarea', type: 'text' },

        // Layer data (JSON containing layer images)
        'layer_data': { selector: '#mrp_layer_data_{tab} textarea', type: 'text', isData: true },

        // Prompts dump (JSON containing layer prompts)
        'prompts_dump': { selector: '#mrp_prompts_dump_{tab} textarea', type: 'text', isData: true },

        // Composite mask image (fallback if layer_data unavailable)
        'mask_data': { selector: '#mrp_mask_data_{tab} textarea', type: 'text', isData: true }
    };

    let stores = {};

    function getStore(tab) {
        if (!stores[tab]) {
            stores[tab] = new state.Store(`ext-mrp-${tab}`);
        }
        return stores[tab];
    }

    function getElement(selector, tab) {
        const actualSelector = selector.replace('{tab}', tab);
        return document.querySelector(actualSelector);
    }

    function saveElement(key, config, tab) {
        const el = getElement(config.selector, tab);
        if (!el) return;

        const store = getStore(tab);

        // Save current value
        const handler = function () {
            store.set(key, this.value);
            state.logging.log(`[MRP] Saved ${key} for ${tab}`);
        };

        // Attach event listener
        el.addEventListener('change', handler);
        el.addEventListener('input', state.utils.debounce(handler.bind(el), 500));

        // For data fields, also listen for programmatic changes
        if (config.isData) {
            const observer = new MutationObserver(() => {
                store.set(key, el.value);
            });
            // Observe value attribute changes
            observer.observe(el, { attributes: true, attributeFilter: ['value'] });

            // Also poll for value changes (Gradio sometimes updates value directly)
            setInterval(() => {
                const currentValue = el.value;
                const storedValue = store.get(key);
                if (currentValue && currentValue !== storedValue && currentValue.length > 10) {
                    store.set(key, currentValue);
                }
            }, 2000);
        }
    }

    function restoreElement(key, config, tab) {
        const el = getElement(config.selector, tab);
        if (!el) return;

        const store = getStore(tab);
        const value = store.get(key);

        if (!value) return;

        // Restore value
        el.value = value;

        // Trigger appropriate events for Gradio to pick up
        if (config.type === 'number') {
            if (typeof updateInput === 'function') {
                updateInput(el);
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }

        state.logging.log(`[MRP] Restored ${key} for ${tab}: ${value.substring(0, 50)}...`);
    }

    function restoreMaskEditor(tab) {
        const store = getStore(tab);

        const maskData = store.get('mask_data');
        const layerData = store.get('layer_data');
        const promptsDump = store.get('prompts_dump');

        if (!maskData && !layerData) {
            state.logging.log(`[MRP] No mask data to restore for ${tab}`);
            return;
        }

        // Wait for MaskEditorAPI to be available
        const waitForAPI = setInterval(() => {
            if (window.MaskEditorAPI) {
                clearInterval(waitForAPI);

                // Ensure editor is initialized
                const editor = window.MaskEditors && window.MaskEditors[tab];
                if (!editor) {
                    // Initialize the editor first
                    window.MaskEditorAPI.init(tab);
                }

                // Wait a bit for initialization, then load data
                setTimeout(() => {
                    state.logging.log(`[MRP] Restoring mask data for ${tab}`);

                    // Load the mask and layer data
                    window.MaskEditorAPI.loadMaskData(tab, maskData, layerData);

                    // Restore layer prompts
                    if (promptsDump) {
                        try {
                            const prompts = JSON.parse(promptsDump);
                            const editorInstance = window.MaskEditors[tab];
                            if (editorInstance) {
                                editorInstance.layerPrompts = prompts;
                                editorInstance.syncPromptFields();
                            }
                        } catch (e) {
                            state.logging.warn('[MRP] Failed to parse prompts dump: ' + e);
                        }
                    }

                    state.logging.log(`[MRP] Mask editor restored for ${tab}`);
                }, 1000);
            }
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => clearInterval(waitForAPI), 30000);
    }

    function handleTab(tab) {
        // First restore non-data elements
        for (const [key, config] of Object.entries(ELEMENTS)) {
            if (!config.isData) {
                restoreElement(key, config, tab);
            }
        }

        // Restore the mask editor (async operation)
        restoreMaskEditor(tab);

        // Setup save handlers for all elements
        for (const [key, config] of Object.entries(ELEMENTS)) {
            saveElement(key, config, tab);
        }
    }

    function init() {
        // Check if MRP extension elements exist
        const mrpContainer = document.querySelector('#mrp_canvas_t2i, #mrp_canvas_i2i');
        if (!mrpContainer) {
            state.logging.log('[MRP] Mask Regional Prompter extension not found');
            return;
        }

        state.logging.log('[MRP] Initializing Mask Regional Prompter state support');

        // Handle each tab
        TABS.forEach(tab => {
            // Wait for the MRP elements to be fully loaded
            const checkElements = setInterval(() => {
                const canvas = document.getElementById(`mrp_canvas_${tab}`);
                const widthInput = document.querySelector(`#mrp_width_${tab} input`);

                if (canvas && widthInput) {
                    clearInterval(checkElements);
                    state.logging.log(`[MRP] Elements found for ${tab}, initializing...`);

                    // Delay to ensure Gradio is fully ready
                    setTimeout(() => handleTab(tab), 1500);
                }
            }, 500);

            // Timeout after 30 seconds
            setTimeout(() => clearInterval(checkElements), 30000);
        });
    }

    return { init };
}());
