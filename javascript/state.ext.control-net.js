window.state = window.state || {};
window.state.extensions = window.state.extensions || {};
state = window.state;


function ControlNetTabContext(tabName, container) {

    this.tabName = tabName;
    this.container = container;
    this.store = new state.Store(`ext-control-net-${this.tabName}`);
    this.tabElements = [];
    this.cnTabs = [];

    // Try multiple selectors for compatibility with different Gradio/Forge versions
    let tabs = this.container.querySelectorAll(':scope > div > div > .tabs > .tabitem');
    if (!tabs.length) {
        tabs = this.container.querySelectorAll('.tabitem');
    }
    if (!tabs.length) {
        tabs = this.container.querySelectorAll('[id*="tabitem"]');
    }
    if (!tabs.length) {
        tabs = this.container.querySelectorAll('.tabs > div[role="tabpanel"]');
    }

    if (tabs.length) {
        tabs.forEach((tabContainer, i) => {
            this.cnTabs.push({
                container: tabContainer,
                store: new state.Store(`ext-control-net-${this.tabName}-${i}`)
            });
        });
    } else {
        this.cnTabs.push({
            container: container,
            store: new state.Store(`ext-control-net-${this.tabName}-0`)
        });
    }
}

state.extensions['control-net'] = (function () {

    let contexts = [];

    function handleToggle() {

        const id = 'toggled';

        contexts.forEach(context => {

            // Try multiple selectors for compatibility
            let elements = context.container.querySelectorAll(`:scope > .label-wrap`);
            if (!elements.length) {
                elements = context.container.querySelectorAll('.label-wrap');
            }

            elements.forEach(element => {
                if (context.store.get(id) === 'true') {
                    state.utils.clickToggleMenu(element);
                    load();
                }
                element.addEventListener('click', function () {
                    // Check for open state using multiple methods for compatibility
                    let isOpen = this.classList.contains('open') ||
                                 this.parentNode.classList.contains('open') ||
                                 state.utils.isAccordionOpen(this.parentNode);
                    context.store.set(id, isOpen);
                    load();
                });
            });
        });
    }

    function bindTabEvents() {
        contexts.forEach(context => {
            // Try multiple selectors for compatibility
            let tabs = context.container.querySelectorAll(':scope > div > div > .tabs > div > button');
            if (!tabs.length) {
                tabs = context.container.querySelectorAll('.tabs .tab-nav button');
            }
            if (!tabs.length) {
                tabs = context.container.querySelectorAll('.tabs > div > button');
            }
            if (!tabs.length) {
                tabs = context.container.querySelectorAll('button[role="tab"]');
            }

            function onTabClick() {
                context.store.set('tab', this.textContent);
                bindTabEvents();
            }
            tabs.forEach(tab => { // dirty hack here
                tab.removeEventListener('click', onTabClick);
                tab.addEventListener('click', onTabClick);
            });
            context.tabElements = tabs;
        });
    }

    function handleTabs() {
        bindTabEvents();
        contexts.forEach(context => {
            let value = context.store.get('tab');
            if (value) {
                for (var i = 0; i < context.tabElements.length; i++) {
                    if (context.tabElements[i].textContent === value) {
                        state.utils.triggerEvent(context.tabElements[i], 'click');
                        break;
                    }
                }
            }
        });
    }

    function handleContext(action) {
        contexts.forEach(context => {
            context.cnTabs.forEach(({ container, store }) => {
                action(container, store);
            });
        });
    }

    // Helper to find checkbox label text
    function getCheckboxLabel(checkbox) {
        // Try nextElementSibling (common pattern)
        if (checkbox.nextElementSibling && checkbox.nextElementSibling.textContent) {
            return checkbox.nextElementSibling.textContent;
        }

        // Try parent label
        let parentLabel = checkbox.closest('label');
        if (parentLabel) {
            // Get text excluding the checkbox itself
            let clone = parentLabel.cloneNode(true);
            let input = clone.querySelector('input');
            if (input) input.remove();
            if (clone.textContent && clone.textContent.trim()) {
                return clone.textContent.trim();
            }
        }

        // Try aria-label or title
        if (checkbox.getAttribute('aria-label')) return checkbox.getAttribute('aria-label');
        if (checkbox.title) return checkbox.title;

        return null;
    }

    // Helper to find select/dropdown label text
    function getSelectLabel(select) {
        // Try label inside the select container
        let label = select.querySelector('label');
        if (label) {
            if (label.firstChild && label.firstChild.textContent) {
                return label.firstChild.textContent;
            }
            if (label.textContent) return label.textContent;
        }

        // Try span with label class
        let span = select.querySelector('span[data-testid="block-label"], span[class*="label"]');
        if (span && span.textContent) return span.textContent;

        // Try previous sibling
        if (select.previousElementSibling) {
            let prevLabel = select.previousElementSibling.querySelector('label, span');
            if (prevLabel && prevLabel.textContent) return prevLabel.textContent;
        }

        return null;
    }

    // Helper to find textarea label text
    function getTextareaLabel(textarea) {
        // Try previousElementSibling
        if (textarea.previousElementSibling && textarea.previousElementSibling.textContent) {
            return textarea.previousElementSibling.textContent;
        }

        // Try parent container for label
        let parent = textarea.closest('.gradio-textbox, [class*="textbox"]');
        if (parent) {
            let label = parent.querySelector('label, span[data-testid="block-label"]');
            if (label && label.textContent) return label.textContent;
        }

        // Try aria-label or placeholder
        if (textarea.getAttribute('aria-label')) return textarea.getAttribute('aria-label');
        if (textarea.placeholder) return textarea.placeholder;

        return null;
    }

    function handleCheckboxes() {
        handleContext((container, store) => {
            let checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(function (checkbox, idx) {
                let labelText = getCheckboxLabel(checkbox);
                // Use index-based fallback if no label found
                let id = labelText ? state.utils.txtToId(labelText) : `checkbox-${idx}`;
                let value = store.get(id);
                if (value) {
                    state.utils.setValue(checkbox, value, 'change');
                }
                checkbox.addEventListener('change', function () {
                    store.set(id, this.checked);
                });
            });
        });
    }

    function handleSelects() {
        handleContext((container, store) => {
            // Use compatibility helper to find dropdowns
            let dropdowns = state.utils.findDropdowns(container);
            dropdowns.forEach(function (select, idx) {
                let labelText = getSelectLabel(select);
                // Use index-based fallback if no label found
                let id = labelText ? state.utils.txtToId(labelText) : `select-${idx}`;
                let value = store.get(id);
                state.utils.handleSelect(select, id, store);
                if (id === 'preprocessor' && value && value.toLowerCase() !== 'none') {
                    state.utils.onNextUiUpdates(handleSliders); // update new sliders if needed
                }
            });
        });
    }

    // Helper to find slider label text with multiple fallback methods
    function getSliderLabel(slider) {
        // Try previousElementSibling first (old structure)
        if (slider.previousElementSibling) {
            let label = slider.previousElementSibling.querySelector('label span');
            if (label && label.textContent) return label.textContent;

            // Try just the label
            label = slider.previousElementSibling.querySelector('label');
            if (label && label.textContent) return label.textContent;

            // Try span directly
            label = slider.previousElementSibling.querySelector('span');
            if (label && label.textContent) return label.textContent;
        }

        // Try parent container for label (Forge/Gradio 4.x structure)
        let parent = slider.closest('.gradio-slider, .slider, [class*="slider"]');
        if (parent) {
            let label = parent.querySelector('label span, label, span[data-testid="block-label"]');
            if (label && label.textContent) return label.textContent;
        }

        // Try looking for label in parent's previous sibling
        if (slider.parentElement && slider.parentElement.previousElementSibling) {
            let label = slider.parentElement.previousElementSibling.querySelector('span, label');
            if (label && label.textContent) return label.textContent;
        }

        return null;
    }

    // Helper to find fieldset/radio label text
    function getFieldsetLabel(fieldset) {
        // Try firstChild.nextElementSibling (old structure)
        if (fieldset.firstChild && fieldset.firstChild.nextElementSibling) {
            let label = fieldset.firstChild.nextElementSibling;
            if (label && label.textContent) return label.textContent;
        }

        // Try legend element
        let legend = fieldset.querySelector('legend');
        if (legend && legend.textContent) return legend.textContent;

        // Try label or span
        let label = fieldset.querySelector('label, span[class*="label"]');
        if (label && label.textContent) return label.textContent;

        return null;
    }

    function handleSliders() {
        handleContext((container, store) => {
            let sliders = container.querySelectorAll('input[type="range"]');
            sliders.forEach(function (slider, idx) {
                let labelText = getSliderLabel(slider);
                // Use index-based fallback if no label found
                let id = labelText ? state.utils.txtToId(labelText) : `slider-${idx}`;
                let value = store.get(id);
                if (value) {
                    state.utils.setValue(slider, value, 'change');
                }
                slider.addEventListener('change', function () {
                    store.set(id, this.value);
                });
            });
        });
    }

    function handleRadioButtons() {
        handleContext((container, store) => {
            let fieldsets = container.querySelectorAll('fieldset');
            fieldsets.forEach(function (fieldset, idx) {
                let radios = fieldset.querySelectorAll('input[type="radio"]');
                let labelText = getFieldsetLabel(fieldset);
                // Use index-based fallback if no label found
                let id = labelText ? state.utils.txtToId(labelText) : `radio-${idx}`;
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
        });
    }

    function handleTextareas() {
        handleContext((container, store) => {
            let textareas = container.querySelectorAll('textarea');
            textareas.forEach(function (textarea, idx) {
                let labelText = getTextareaLabel(textarea);
                // Use index-based fallback if no label found
                let id = labelText ? state.utils.txtToId(labelText) : `textarea-${idx}`;
                let value = store.get(id);
                if (value) {
                    state.utils.setValue(textarea, value, 'change');
                }
                textarea.addEventListener('change', function () {
                    store.set(id, this.value);
                });
            });
        });
    }

    function load() {
        setTimeout(function () {
            handleTabs();
            handleCheckboxes();
            handleSelects();
            handleSliders();
            handleRadioButtons();
            handleTextareas();
        }, 500);
    }

    function init() {

        // Try multiple selectors for ControlNet container (Forge vs A1111 compatibility)
        let elements = gradioApp().querySelectorAll('#controlnet');
        if (!elements.length) {
            elements = gradioApp().querySelectorAll('[id*="controlnet"]');
        }
        if (!elements.length) {
            elements = gradioApp().querySelectorAll('#txt2img_controlnet, #img2img_controlnet');
        }
        // Forge built-in ControlNet uses different IDs
        if (!elements.length) {
            elements = gradioApp().querySelectorAll('[id*="forge_controlnet"], [id*="sd_forge_controlnet"]');
        }

        if (!elements.length) {
            state.logging.log('ControlNet extension not found');
            return;
        }

        // Handle both single container and separate txt2img/img2img containers
        if (elements.length >= 2) {
            contexts[0] = new ControlNetTabContext('txt2img', elements[0]);
            contexts[1] = new ControlNetTabContext('img2img', elements[1]);
        } else if (elements.length === 1) {
            // Single container mode
            contexts[0] = new ControlNetTabContext('main', elements[0]);
        }

        handleToggle();
        load();
    }

    return { init };
}());
