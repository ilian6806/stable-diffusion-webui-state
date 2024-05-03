window.state = window.state || {};
state = window.state;

state.core = (function () {

    const TABS = ['txt2img', 'img2img'];
    const ELEMENTS = {
        'prompt': 'prompt',
        'negative_prompt': 'neg_prompt',
        'sampling_steps': 'steps',
        'restore_faces': 'restore_faces',
        'tiling': 'tiling',
        'hires_steps': 'hires_steps',
        'hires_scale': 'hr_scale',
        'hires_resize_x': 'hr_resize_x',
        'hires_resize_y': 'hr_resize_y',
        'hires_denoising_strength': 'denoising_strength',
        'width': 'width',
        'height': 'height',
        'batch_count': 'batch_count',
        'batch_size': 'batch_size',
        'cfg_scale': 'cfg_scale',
        'denoising_strength': 'denoising_strength',
        'seed': 'seed'
    };

    const ELEMENTS_WITHOUT_PREFIX = {
        'resize_mode': 'resize_mode',
    };

    const SELECTS = {
        'sampling': 'sampling',
        'scheduler': 'scheduler',
        'hires_upscaler': 'hr_upscaler',
        'script': '#script_list',
    };

    const MULTI_SELECTS = {
        'styles': 'styles'
    };

    const TOGGLE_BUTTONS = {
        'extra_networks': 'extra_networks',
        'hires_fix': 'hr'
    };

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
                    console.error('[state]: Error:', error);
                }
            })
            .catch(error => console.error('[state]: Error getting JSON file:', error));
    }

    function forEachElement(list, config, action) {
        for (const [settingId, element] of Object.entries(list)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    action(element, tab);
                }
            });
        }
    }

    function load(config) {

        store = new state.Store();

        loadUI();
        restoreTabs(config);

        forEachElement(ELEMENTS, config, (element, tab) => {
            handleSavedInput(`${tab}_${element}`);
        });

        forEachElement(ELEMENTS_WITHOUT_PREFIX, config, (element, tab) => {
            handleSavedInput(`${element}`);
        });

        forEachElement(SELECTS, config, (element, tab) => {
            handleSavedSelects(`${tab}_${element}`);
        });

        forEachElement(MULTI_SELECTS, config, (element, tab) => {
            handleSavedMultiSelects(`${tab}_${element}`);
        });

        forEachElement(TOGGLE_BUTTONS, config, (element, tab) => {
            handleToggleButton(`${tab}_${element}`);
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

    function loadUI() {
        let quickSettings = gradioApp().getElementById("quicksettings");
        let className = quickSettings.querySelector('button').className;
        quickSettings.appendChild(createHeaderButton('State: Reset', "*️⃣", className, {}, actions.resetAll));
        quickSettings.appendChild(createHeaderButton('State: Export',"📤", className, {}, actions.exportState));
        let fileInput = createHeaderFileInput('State: Import',"📥", className);
        quickSettings.appendChild(fileInput.hiddenButton);
        quickSettings.appendChild(fileInput.button);
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

    function handleSavedInput(id) {

        const elements = gradioApp().querySelectorAll(`#${id} textarea, #${id} input`);
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

    function handleSavedSelects(id) {
        state.utils.handleSelect(getElement(id), id, store);
    }

    function handleSavedMultiSelects(id) {
        const select = gradioApp().getElementById(`${id}`);
        state.utils.handleMultipleSelect(select, id, store);
    }

    function handleToggleButton(id) {
        let btn = gradioApp().querySelector(`button#${id}`);
        if (! btn) { // New gradio version
            btn = gradioApp().querySelector(`.input-accordion#${id}`);
        }
        if (! btn) {
            state.logging.warn(`Button not found: ${id}`);
            return;
        }
        if (store.get(id) === 'true') {
            state.utils.clickToggleMenu(btn);
        }
        btn.addEventListener('click', function () {
            let classList = Array.from(this.classList);
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
