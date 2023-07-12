window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;

state.extensions['multidiffusion'] = (function () {

    let containers = [];
    let store = null;

    function handleCheckboxes(container, name) {
        let checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function (checkbox, idx) {
            let id = `md-${name}-checkbox-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(checkbox, value, 'change');
            }
            checkbox.addEventListener('change', function () {
                store.set(id, this.checked);
            });
        });
    }

    function handleSliders(container, name) {
        let sliders = container.querySelectorAll('input[type="range"]');
        sliders.forEach(function (slider, idx) {
            let id = `md-${name}-slider-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(slider, value, 'change');
            }
            slider.addEventListener('change', function () {
                store.set(id, this.value);
            });
        });
    }

    function handleTextboxes(container, name) {
        let textboxes = container.querySelectorAll('textarea');
        textboxes.forEach(function (textbox, idx) {
            let id = `md-${name}-textbox-${idx}`;
            let value = store.get(id);
            if (value) {
                state.utils.setValue(textbox, value, 'change');
            }
            textbox.addEventListener('change', function () {
                store.set(id, this.value);
            });
        });
    }

    function handleSelects(container, name) {
        let selects = container.querySelectorAll('.gradio-dropdown')
        selects.forEach(function (select, idx) {
            state.utils.handleSelect(select, `md-${name}-select-${idx}`, store);
        });
    }

    function handleRadioButtons(container, name) {
        let fieldsets = container.querySelectorAll('fieldset');
        fieldsets.forEach(function (fieldset, idx) {
            let radios = fieldset.querySelectorAll('input[type="radio"]');
            let id = `md-${name}-fieldset-${idx}`;
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

    function handleDropdowns(container, name) {
        let dropdowns = container.querySelectorAll('.gradio-accordion .label-wrap');
        dropdowns.forEach(function (dropdown, idx) {
            let id = `md-${name}-dropdown-${idx}`;
            let value = store.get(id);

            if (value && value === 'true') {
                state.utils.triggerEvent(dropdown, 'click');
            }
            dropdown.addEventListener('click', function () {
                let span = this.querySelector('.transition, .icon');
                store.set(id, span.style.transform !== 'rotate(90deg)');
            });
        });
    }

    function load() {
        setTimeout(function () {
            containers.forEach(({container, name}) => {
                handleCheckboxes(container, name);
                handleSliders(container, name);
                handleTextboxes(container, name);
                handleSelects(container, name);
                handleRadioButtons(container, name);
                handleDropdowns(container, name);
            });
        }, 500);
    }

    function init() {

        let spanTags = gradioApp().getElementsByTagName("span");
        for (var i = 0; i < spanTags.length; i++) {
            if (spanTags[i].textContent == 'Tiled Diffusion') {
                containers.push({container: spanTags[i].parentElement.parentElement,name: 'diffusion'});
            }
            if (spanTags[i].textContent == 'Tiled VAE') {
                containers.push({container: spanTags[i].parentElement.parentElement,name: 'vae'});
                break;
            }
        };

        store = new state.Store('ext-multidiffusion');

        if (! containers.length) {
            return;
        }

        load();
    }

    return { init };
}());
