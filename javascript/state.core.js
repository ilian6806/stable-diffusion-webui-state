window.state = window.state || {};
state = window.state;

state.core = (function () {

    const TABS = ['txt2img', 'img2img'];

    const INPUTS = { // Basic input elements
        'prompt': 'prompt',
        'negative_prompt': 'neg_prompt',
        'sampling_steps': 'steps',
        'hires_steps': 'hires_steps',
        'hires_scale': 'hr_scale',
        'hires_resize_x': 'hr_resize_x',
        'hires_resize_y': 'hr_resize_y',
        'hires_denoising_strength': 'denoising_strength',
        'refiner_switch': 'switch_at',
        'upscaler_2_visibility': 'extras_upscaler_2_visibility',
        'upscaler_scale_by_resize': 'extras_upscaling_resize',
        'upscaler_scale_by_max_side_length': 'extras_upscale_max_side_length',
        'upscaler_scale_to_w': 'extras_upscaling_resize_w',
        'upscaler_scale_to_h': 'extras_upscaling_resize_h',
        'upscaler_scale_to_crop': 'extras_upscaling_crop',
        'width': 'width',
        'height': 'height',
        'batch_count': 'batch_count',
        'batch_size': 'batch_size',
        'cfg_scale': 'cfg_scale',
        'denoising_strength': 'denoising_strength',
        'resize_mode': 'resize_mode',
        'seed': 'seed',
    };

    const SELECTS = { // Dropdowns
        'sampling': 'sampling',
        'scheduler': 'scheduler',
        'hires_upscaler': 'hr_upscaler',
        'refiner_checkpoint': 'checkpoint',
        'upscaler_1': 'extras_upscaler_1',
        'upscaler_2': 'extras_upscaler_2',
        'script': '#script_list',
    };

    const MULTI_SELECTS = { // Multi-select dropdowns
        'styles': 'styles'
    };

    const TOGGLE_BUTTONS = { // Toggle buttons
        'hires_fix': 'hr',
        'refiner': 'enable',
        'tiled_diffusion': 'MD-t2i-enabled',
    };

    // *** Exceptions *** //

    // Elements that don't have a tab prefix
    const ELEMENTS_WITHOUT_PREFIX = [
        'resize_mode',
        'upscaler_2_visibility',
        'upscaler_scale_by_resize',
        'upscaler_scale_by_max_side_length',
        'upscaler_scale_to_w',
        'upscaler_scale_to_h',
        'upscaler_scale_to_crop',
        'upscaler_1',
        'upscaler_2',
        'tiled_diffusion',
    ];

    // Elements that have the same id in different tabs
    const ELEMENTS_WITH_DUPLICATE_IDS = [
        'upscaler_2_visibility',
        'upscaler_scale_by_resize',
        'upscaler_scale_by_max_side_length',
        'upscaler_scale_to_w',
        'upscaler_scale_to_h',
        'upscaler_scale_to_crop',
        'upscaler_1',
        'upscaler_2',
        'tiled_diffusion',
    ];

    let store = null;

    function hasSetting(id, tab) {
        const suffix = tab ? `_${tab}` : '';
        return this[`state${suffix}`] && this[`state${suffix}`].indexOf(id) > -1;
    }

    function init() {
        fetch('/state/config.json?_=' + (+new Date()))
            .then(response => response.json())
            .then(config => {
                try {
                    config.hasSetting = hasSetting
                    load(config);
                } catch (error) {
                    state.logging.error(error);
                }
            })
            .catch(error => state.logging.error(error));
    }

    function forEachElement(list, config, action) {
        for (const [settingId, elementId] of Object.entries(list)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    action(settingId, elementId, tab);
                }
            });
        }
    }

    function executeElementHandler(handler, settingId, elementId, tab) {

        // Handler will use much slower '[id="elementId"]' selector if elementId is in ELEMENTS_WITH_DUPLICATE_IDS
        let useDuplicateIdsSelector = ELEMENTS_WITH_DUPLICATE_IDS.indexOf(settingId) > -1;

        if (ELEMENTS_WITHOUT_PREFIX.indexOf(settingId) > -1) {
            return handler(elementId, useDuplicateIdsSelector);
        } else {
            return handler(`${tab}_${elementId}`, useDuplicateIdsSelector);
        }
    }

    function getHandlerByElementId(settingId) {
        if (settingId in INPUTS) {
            return handleSavedInput;
        } else if (settingId in SELECTS) {
            return handleSavedSelects;
        } else if (settingId in MULTI_SELECTS) {
            return handleSavedMultiSelects;
        } else if (settingId in TOGGLE_BUTTONS) {
            return handleToggleButton;
        }
    }

    function load(config) {

        store = new state.Store();

        loadUI(config);
        restoreTabs(config);

        const ALL_ELEMENTS = Object.assign({}, INPUTS, SELECTS, MULTI_SELECTS, TOGGLE_BUTTONS);

        forEachElement(ALL_ELEMENTS, config, (settingId, elementId, tab) => {
            let method = getHandlerByElementId(settingId);
            if (method) {
                executeElementHandler(method, settingId, elementId, tab);
            } else {
                state.logging.warn(`Element handler not found for: ${elementId}`);
            }
        });

        handleExtensions(config);
        handleSettingsPage();
    }

    function createHeaderButton(title, text, className, style, action) {

        const button = state.utils.html.create('button', {
            title: title,
            innerHTML: text,
            className: className,
        }, style);

        if (action) {
            button.addEventListener('click', action);
        }

        return button;
    }

    function createHeaderFileInput(title, text, className) {

        let inputId = 'state-import-file-inline';

        let importBtn = createHeaderButton(title,text, className, {
            display: 'none'
        }, () => {
            actions.importState(inputId);
        });

        let label = state.utils.html.create('label', {}, { cursor: 'pointer' });
        label.appendChild(state.utils.html.create('input', {
            type: 'file',
            id: inputId,
            accept: 'application/json',
        }, {
            display: 'none'
        }));
        label.appendChild(document.createTextNode(text));
        label.addEventListener('change', () => {
            importBtn.dispatchEvent(new Event('click'));
        });

        let button = createHeaderButton(title, '', className, {});
        button.appendChild(label);

        return {
            hiddenButton: importBtn,
            button: button
        };
    }

    function loadUI(config) {

        let quickSettings = gradioApp().getElementById("quicksettings");
        let className = quickSettings.querySelector('button').className;
        let uiConfig = config['state_ui'];

        if (!uiConfig || uiConfig.indexOf('Reset Button') > -1) {
            quickSettings.appendChild(createHeaderButton('State: Reset', "*️⃣", className, {}, actions.resetAll));
        }

        if (!uiConfig || uiConfig.indexOf('Export Button') > -1) {
            quickSettings.appendChild(createHeaderButton('State: Export',"📤", className, {}, actions.exportState));
        }

        if (!uiConfig || uiConfig.indexOf('Import Button') > -1) {
            let fileInput = createHeaderFileInput('State: Import',"📥", className);
            quickSettings.appendChild(fileInput.hiddenButton);
            quickSettings.appendChild(fileInput.button);
        }
    }

    function restoreTabs(config) {

        if (! config.hasSetting('tabs')) {
            return;
        }

        const tabs = gradioApp().querySelectorAll('#tabs > div:first-child button');
        const value = store.get('tab');

        if (value) {
            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].textContent === value) {
                    state.utils.triggerEvent(tabs[i], 'click');
                    break;
                }
            }
        }
        // Use this when onUiTabChange is fixed
        // onUiTabChange(function () {
        //     store.set('tab', gradioApp().querySelector('#tabs .tab-nav button.selected').textContent);
        // });
        bindTabClickEvents();
    }

    function bindTabClickEvents() {
        Array.from(gradioApp().querySelectorAll('#tabs .tab-nav button')).forEach(tab => {
            tab.removeEventListener('click', storeTab);
            tab.addEventListener('click', storeTab);
        });
    }

    function storeTab() {
        store.set('tab', gradioApp().querySelector('#tabs .tab-nav button.selected').textContent);
        bindTabClickEvents(); // dirty hack here...
    }

    function getElement(id) {
        for (let i = 0; i < TABS.length; i++) {
            if (id.startsWith(`${TABS[i]}_#`)) {
                // handle elements with same ids in different tabs...
                return gradioApp().querySelector('#tab_' + id.replace(`${TABS[i]}_#`, `${TABS[i]} #`));
            }
        }
        return gradioApp().getElementById(id);
    }

    function handleSavedInput(id, duplicateIds) {

        let elements = null;

        if (duplicateIds) {
            elements = gradioApp().querySelectorAll(`[id="${id}"] textarea, [id="${id}"] input`);
        } else {
            elements = gradioApp().querySelectorAll(`#${id} textarea, #${id} input`);
        }

        const events = ['change', 'input'];

        if (! elements || ! elements.length) {
            state.logging.warn(`Input not found: ${id}`);
            return;
        }

        let forEach = function (action) {
            events.forEach(function(event) {
                elements.forEach(function (element) {
                    action.call(element, event);
                });
            });
        };

        forEach(function (event) {
            this.addEventListener(event, function () {
                let value = this.value;
                if (this.type && this.type === 'checkbox') {
                    value = this.checked;
                }
                store.set(id, value);
            });
        });

        TABS.forEach(tab => {
            const seedInput = gradioApp().querySelector(`#${tab}_seed input`);
            ['random_seed', 'reuse_seed'].forEach(id => {
                const btn = gradioApp().querySelector(`#${tab}_${id}`);
                btn.addEventListener('click', () => {
                    setTimeout(() => {
                        state.utils.triggerEvent(seedInput, 'change');
                    }, 100);
                });
            });
        });

        let value = store.get(id);

        if (! value) {
            return;
        }

        forEach(function (event) {
            state.utils.setValue(this, value, event);
        });
    }

    function handleSavedSelects(id, duplicateIds) {
        if (duplicateIds) {
            const elements = gradioApp().querySelectorAll(`[id="${id}"]`);
            if (! elements || ! elements.length) {
                state.logging.warn(`Select not found: ${id}`);
                return;
            }
            elements.forEach(function (element) {
                state.utils.handleSelect(element, id, store);
            });
        } else {
            state.utils.handleSelect(getElement(id), id, store);
        }
    }

    function handleSavedMultiSelects(id, duplicateIds) {
        const select = gradioApp().getElementById(`${id}`);
        state.utils.handleMultipleSelect(select, id, store);
    }

    function handleToggleButton(id, duplicateIds) {
        let btn = gradioApp().querySelector(`button#${id}`);
        if (! btn) { // New gradio version
            btn = gradioApp().querySelector(`.input-accordion#${id} .label-wrap`);
        }
        if (! btn) {
            state.logging.warn(`Button not found: ${id}`);
            return;
        }
        if (store.get(id) === 'true') {
            state.utils.clickToggleMenu(btn);
        }
        btn.addEventListener('click', function () {
            let classList = Array.from(this.parentNode.classList);
            if (btn.tagName === 'BUTTON') { // Old gradio version
                store.set(id, classList.indexOf('secondary-down') === -1);
            } else {
                store.set(id, classList.indexOf('input-accordion-open') > -1);
            }
        });
    }

    function handleExtensions(config) {
        if (config['state_extensions']) {
            config['state_extensions'].forEach(function (ext) {
                if (ext in state.extensions) {
                    state.extensions[ext].init();
                }
            });
        }
    }

    function handleSettingsPage() {

        const page = gradioApp().querySelector('#settings_state');
        state.utils.html.setStyle(page.querySelectorAll('fieldset'), {
            'marginTop': '20px',
            'marginBottom': '10px'
        });

        let buttonsContainer = gradioApp().querySelector('#settings_state_buttons');
        if (buttonsContainer) {
            buttonsContainer.parentNode.removeChild(buttonsContainer);
        }
        buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'settings_state_buttons';

        let setCheckboxes = function (value, checkFunc) {
            checkFunc = checkFunc || function () { return true; };
            Array.from(page.querySelectorAll('input[type="checkbox"]')).forEach(function (el) {
                if (checkFunc(el)) {
                    if (el.checked !== value) {
                        el.checked = value;
                        state.utils.triggerEvent(el, 'change');
                    }
                } else if (el.checked === value) {
                    el.checked = !value;
                    state.utils.triggerEvent(el, 'change');
                }
            });
        };
        buttonsContainer.appendChild(state.utils.html.createButton('Select All', function () {
            setCheckboxes(true);
        }));
        buttonsContainer.appendChild(state.utils.html.createButton('Select All Except Seeds', function () {
            setCheckboxes(true, function (el) {
                return el.nextElementSibling.textContent.indexOf('seed') === -1;
            });
        }));
        buttonsContainer.appendChild(state.utils.html.createButton('Unselect All', function () {
            setCheckboxes(false);
        }));
        state.utils.html.setStyle(buttonsContainer, {
            'marginTop': '20px',
            'marginBottom': '10px'
        });
        buttonsContainer.appendChild(state.utils.html.create('hr'));
        buttonsContainer.appendChild(state.utils.html.create('div', { innerHTML: 'Actions' }, { marginBottom: '10px' }));
        buttonsContainer.appendChild(state.utils.html.createButton('Reset All', actions.resetAll));
        buttonsContainer.appendChild(state.utils.html.createButton('Export State', actions.exportState));
        buttonsContainer.appendChild(state.utils.html.createButton('Import State', actions.importState));
        buttonsContainer.appendChild(state.utils.html.create('input', {
            id: 'state-import-file', type: 'file', accept: 'application/json'
        }));
        page.appendChild(buttonsContainer);
    }

    let actions = {
        resetAll: function () {
            let confirmed = confirm('Reset all state values?');
            if (confirmed) {
                store.clearAll();
                alert('All state values deleted!');
            }
        },
        exportState: function () {
            state.utils.saveFile('sd-webui-state', store.getAll());
        },
        importState: function (id) {
            const fileInput = gradioApp().getElementById(id || 'state-import-file');
            if (! fileInput.files || ! fileInput.files[0]) {
                alert('Please select a JSON file!');
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function (event) {
                store.load(JSON.parse(event.target.result));
                window.location.reload();
            };
            reader.readAsText(file);
        }
    };

    return { init };
}());
