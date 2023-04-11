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
        'hires_fix': 'enable_hr',
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
        'hires_upscaler': 'hr_upscaler',
    };

    const MULTI_SELECTS = {
        'styles': 'styles'
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

    function load(config) {

        store = new state.Store();

        loadUI();
        restoreTabs(config);

        for (const [settingId, element] of Object.entries(ELEMENTS)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    handleSavedInput(`${tab}_${element}`);
                }
            });
        }

        for (const [settingId, element] of Object.entries(ELEMENTS_WITHOUT_PREFIX)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    handleSavedInput(`${element}`);
                }
            });
        }

        for (const [settingId, element] of Object.entries(SELECTS)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    handleSavedSelects(`${tab}_${element}`);
                }
            });
        }

        for (const [settingId, element] of Object.entries(MULTI_SELECTS)) {
            TABS.forEach(tab => {
                if (config.hasSetting(settingId, tab)) {
                    handleSavedMultiSelects(`${tab}_${element}`);
                }
            });
        }

        handleExtensions(config);
        handleSettingsPage();
    }

    function loadUI() {
        let resetBtn = document.createElement("button");
        resetBtn.innerHTML = "*️⃣";
        resetBtn.addEventListener('click', actions.resetAll);
        let quickSettings = gradioApp().getElementById("quicksettings");
        resetBtn.className = quickSettings.querySelector('button').className;
        quickSettings.appendChild(resetBtn);
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

    function handleSavedInput(id) {

        const elements = gradioApp().querySelectorAll(`#${id} textarea, #${id} input`);
        const events = ['change', 'input'];

        if (! elements || ! elements.length) {
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
        const select = gradioApp().getElementById(`${id}`);
        state.utils.handleSelect(select, id, store);
    }

    function handleSavedMultiSelects(id) {
        const select = gradioApp().getElementById(`${id}`);
        state.utils.handleMultipleSelect(select, id, store);
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
                } else  if (el.checked === value) {
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
        importState: function () {
            const fileInput = gradioApp().getElementById('state-import-file');
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
