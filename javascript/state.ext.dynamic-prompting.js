window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;

state.extensions['dynamic prompting'] = (function () {

    let container = null;
    let store = null;

    function handleCheckboxes() {
        let checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function (checkbox, idx) {
            let id = `dp-checkbox-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(checkbox, value, 'change');
            }
            checkbox.addEventListener('change', function () {
                store.set(id, this.checked);
            });
        });
    }

    function handleSliders() {
        let sliders = container.querySelectorAll('input[type="range"]');
        sliders.forEach(function (slider, idx) {
            let id = `dp-slider-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(slider, value, 'change');
            }
            slider.addEventListener('change', function () {
                store.set(id, this.value);
            });
        });
    }

    function handleTextboxes() {
        let textboxes = container.querySelectorAll('textarea');
        textboxes.forEach(function (textbox, idx) {
            let id = `dp-textbox-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(textbox, value, 'change');
            }
            textbox.addEventListener('change', function () {
                store.set(id, this.value);
            });
        });
    }

    function handleSelects() {
        // Use compatibility helper to find dropdowns
        let selects = state.utils.findDropdowns(container);
        selects.forEach(function (select, idx) {
            state.utils.handleSelect(select, `dp-select-${idx}`, store);
        });
    }

    function handleRadioButtons() {
        let fieldsets = container.querySelectorAll('fieldset');
        fieldsets.forEach(function (fieldset, idx) {
            let radios = fieldset.querySelectorAll('input[type="radio"]');
            let id = `dp-fieldset-${idx}`
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

    function handleDropdowns() {
        // Use compatibility helper to find accordions
        let accordions = state.utils.findAccordions(container);
        accordions.forEach(function (accordion, idx) {
            let labelWrap = accordion.querySelector('.label-wrap');
            if (!labelWrap) return;

            let id = `dp-dropdown-${idx}`;
            let value = store.get(id);

            if (value && value === 'true') {
                state.utils.triggerEvent(labelWrap, 'click');
            }
            labelWrap.addEventListener('click', function () {
                // Use multiple methods to check open state for compatibility
                let isOpen = this.classList.contains('open') ||
                             this.parentNode.classList.contains('open') ||
                             state.utils.isAccordionOpen(this.parentNode);
                store.set(id, isOpen);
            });
        });
    }

    function load() {
        setTimeout(function () {
            handleCheckboxes();
            handleSliders();
            handleTextboxes();
            handleSelects();
            handleRadioButtons();
            handleDropdowns();
        }, 500);
    }

    function init() {

        // Try multiple selectors for Dynamic Prompting container (Forge vs A1111 compatibility)
        container = gradioApp().getElementById('sddp-dynamic-prompting');
        if (!container) {
            container = gradioApp().querySelector('[id*="dynamic-prompting"]');
        }
        if (!container) {
            container = gradioApp().querySelector('[id*="dynamicprompts"]');
        }
        if (!container) {
            container = gradioApp().querySelector('[id*="dynamic_prompts"]');
        }

        store = new state.Store('ext-dynamic-prompting');

        if (!container) {
            state.logging.log('Dynamic Prompting extension not found');
            return;
        }

        load();
    }

    return { init };
}());
