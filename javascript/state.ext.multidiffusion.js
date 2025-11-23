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
        // Use compatibility helper to find dropdowns
        let selects = state.utils.findDropdowns(container);
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
        // Use compatibility helper to find accordions
        let accordions = state.utils.findAccordions(container);
        accordions.forEach(function (accordion, idx) {
            let labelWrap = accordion.querySelector('.label-wrap');
            if (!labelWrap) return;

            let id = `md-${name}-dropdown-${idx}`;
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

        // Try to find Tiled Diffusion/VAE containers by text content
        let spanTags = gradioApp().getElementsByTagName("span");
        for (var i = 0; i < spanTags.length; i++) {
            let text = spanTags[i].textContent.trim();
            if (text === 'Tiled Diffusion' || text === 'Tiled Diffusion (Multidiffusion)') {
                let parent = spanTags[i].parentElement;
                // Navigate up to find the accordion container
                while (parent && !parent.classList.contains('gradio-accordion') && !parent.classList.contains('accordion') && !parent.id) {
                    parent = parent.parentElement;
                }
                if (parent) {
                    containers.push({container: parent, name: 'diffusion'});
                }
            }
            if (text === 'Tiled VAE') {
                let parent = spanTags[i].parentElement;
                while (parent && !parent.classList.contains('gradio-accordion') && !parent.classList.contains('accordion') && !parent.id) {
                    parent = parent.parentElement;
                }
                if (parent) {
                    containers.push({container: parent, name: 'vae'});
                }
            }
        }

        // Also try by ID for Forge compatibility
        if (!containers.length) {
            let tiledDiff = gradioApp().querySelector('[id*="tiled_diffusion"], [id*="multidiffusion"]');
            if (tiledDiff) {
                containers.push({container: tiledDiff, name: 'diffusion'});
            }
            let tiledVae = gradioApp().querySelector('[id*="tiled_vae"]');
            if (tiledVae) {
                containers.push({container: tiledVae, name: 'vae'});
            }
        }

        store = new state.Store('ext-multidiffusion');

        if (!containers.length) {
            state.logging.log('Multidiffusion/Tiled VAE extension not found');
            return;
        }

        load();
    }

    return { init };
}());
