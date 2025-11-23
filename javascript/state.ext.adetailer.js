window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;

state.extensions['adetailer'] = (function () {

    let container = null;
    let store = null;
    let cnTabs = [];

    function bindTabEvents() {
        // Try multiple selectors for compatibility
        let tabs = container.querySelectorAll('.tabs > div > button');
        if (!tabs.length) {
            tabs = container.querySelectorAll('.tabs .tab-nav button');
        }
        if (!tabs.length) {
            tabs = container.querySelectorAll('button[role="tab"]');
        }
        tabs.forEach(tab => { // dirty hack here
            tab.removeEventListener('click', onTabClick);
            tab.addEventListener('click', onTabClick);
        });
        return tabs;
    }

    function handleTabs() {
        let tabs = bindTabEvents();
        let value = store.get('tab');
        if (value) {
            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].textContent === value) {
                    state.utils.triggerEvent(tabs[i], 'click');
                    break;
                }
            }
        }
    }

    function onTabClick() {
        store.set('tab', this.textContent);
        bindTabEvents();
    }

    function handleCheckbox(checkbox, id) {
        if (!checkbox) return;

        let value = store.get(id);
        if (value) {
            state.utils.setValue(checkbox, value, 'change');
        }
        checkbox.addEventListener('change', function () {
            store.set(id, this.checked);
        });
    }

    function handleCheckboxes(container, container_idx) {
        let checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function checkbox(checkbox, idx) {
            handleCheckbox(checkbox, `ad-tab-${container_idx}-checkbox-${idx}`)
        });
    }

    function handleSliders(container, container_idx) {
        let sliders = container.querySelectorAll('input[type="range"]');
        sliders.forEach(function (slider, idx) {
            let id = `ad-tab-${container_idx}-slider-${idx}`;
            let value = store.get(id);
            if (value) {
            state.utils.setValue(slider, value, 'change');
            }
            slider.addEventListener('change', function () {
            store.set(id, this.value);
            });
        });
    }

    function handleTextboxes(container, container_idx) {
        let textboxes = container.querySelectorAll('textarea');
        textboxes.forEach(function (textbox, idx) {
            let id = `ad-tab-${container_idx}-textbox-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(textbox, value, 'change');
            }
            textbox.addEventListener('change', function () {
                store.set(id, this.value);
            });
        });
    }

    function handleSelects(container, container_idx) {
        // Use compatibility helper to find dropdowns
        let selects = state.utils.findDropdowns(container);
        selects.forEach(function (select, idx) {
            state.utils.handleSelect(select, `ad-tab-${container_idx}-select-${idx}`, store);
        });
    }

    function handleRadioButtons(container, container_idx) {
        let fieldsets = container.querySelectorAll('fieldset');
        fieldsets.forEach(function (fieldset, idx) {
            let radios = fieldset.querySelectorAll('input[type="radio"]');
            let id = `ad-tab-${container_idx}-fieldset-${idx}`;
            let value = store.get(id);
            if (value) {
                radios.forEach(function (radio) {
                    state.utils.setValue(radio, value, 'change');
                });
            }
            radios.forEach(function (radio) {
                radio.addEventListener('change', function () {
                    store.set(id, this.value);
                });
            });
        });
    }

    function handleDropdown(dropdown, id) {
        if (!dropdown) return;

        let value = store.get(id);

        if (value && value === 'true') {
            state.utils.triggerEvent(dropdown, 'click');
        }
        dropdown.addEventListener('click', function () {
            // Use multiple methods to check open state for compatibility
            let isOpen = this.classList.contains('open') ||
                         this.parentNode.classList.contains('open') ||
                         state.utils.isAccordionOpen(this.parentNode);
            store.set(id, isOpen);
        });
    }

    function handleDropdowns(container, container_idx) {
        // Use compatibility helper to find accordions
        let accordions = state.utils.findAccordions(container);
        accordions.forEach(function (accordion, idx) {
            let labelWrap = accordion.querySelector('.label-wrap');
            if (labelWrap) {
                handleDropdown(labelWrap, `ad-tab-${container_idx}-dropdown-${idx}`);
            }
        });
    }

    function load() {
        setTimeout(function () {
            // Try multiple selectors for the main accordion
            let mainAccordion = container.querySelector('#script_txt2img_adetailer_ad_main_accordion > .label-wrap');
            if (!mainAccordion) {
                mainAccordion = container.querySelector('.label-wrap');
            }
            handleDropdown(mainAccordion, 'ad-dropdown-main');

            // Try multiple selectors for the enable checkbox
            let enableCheckbox = container.querySelector('#script_txt2img_adetailer_ad_enable > label > input');
            if (!enableCheckbox) {
                enableCheckbox = container.querySelector('input[type="checkbox"]');
            }
            handleCheckbox(enableCheckbox, 'ad-checkbox-enable');

            cnTabs.forEach(({ container, container_idx }) => {
                handleTabs(container, container_idx);
                handleTextboxes(container, container_idx);
                handleCheckboxes(container, container_idx);
                handleSliders(container, container_idx);
                handleRadioButtons(container, container_idx);
                handleSelects(container, container_idx);
                handleDropdowns(container, container_idx);
            });
        }, 500);
    }

    function init() {

        // Try multiple selectors for ADetailer container (Forge vs A1111 compatibility)
        container = gradioApp().getElementById('script_txt2img_adetailer_ad_main_accordion');
        if (!container) {
            container = gradioApp().querySelector('[id*="adetailer"]');
        }
        if (!container) {
            container = gradioApp().querySelector('[id*="ADetailer"]');
        }

        store = new state.Store('ext-adetailer');

        if (!container) {
            state.logging.log('ADetailer extension not found');
            return;
        }

        // Try multiple selectors for tabs
        let tabs = container.querySelectorAll('.tabitem');
        if (!tabs.length) {
            tabs = container.querySelectorAll('[id*="tabitem"]');
        }
        if (!tabs.length) {
            tabs = container.querySelectorAll('.tabs > div[role="tabpanel"]');
        }

        if (tabs.length) {
            cnTabs = [];
            tabs.forEach((tabContainer, i) => {
                cnTabs.push({
                    container: tabContainer,
                    container_idx: i
                });
            });
        } else {
            cnTabs = [{
                container: container,
                container_idx: 0
            }];
        }

        load();
    }

    return { init };
}());
