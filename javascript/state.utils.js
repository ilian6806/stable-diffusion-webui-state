window.state = window.state || {};
state = window.state;
let selectingQueue = -1;

state.utils = {
    triggerEvent: function triggerEvent(element, event) {
        if (! element) {
            state.logging.warn('Element not found');
            return;
        }
        element.dispatchEvent(new Event(event.trim()));
        return element;
    },
    triggerMouseEvent: function triggerMouseEvent(element, event) {
        if (! element) {
            state.logging.warn('Element not found');
            return;
        }
        event = event || 'click';
        element.dispatchEvent(new MouseEvent(event, {
            view: window,
            bubbles: true,
            cancelable: true,
        }));
        return element;
    },
    clickToggleMenu: function openToggleMenu(element) {
        if (! element) {
            state.logging.warn('Toggle button not found');
            return;
        }
        element.click();
        return element;
    },
    setValue: function setValue(element, value, event) {
        switch (element.type) {
            case 'checkbox':
                element.checked = value === 'true';
                this.triggerEvent(element, event);
                break;
            case 'radio':
                if (element.value === value) {
                    element.checked = true;
                    this.triggerEvent(element, event);
                } else {
                    element.checked = false;
                }
                break;
            case 'number':
            case 'range':
                // For sliders and number inputs, use Forge pattern
                element.value = value;
                if (typeof updateInput === 'function') {
                    updateInput(element);
                }
                break;
            case 'textarea':
                // Textareas (prompts) - use Forge pattern
                element.value = value;
                if (typeof updateInput === 'function') {
                    updateInput(element);
                }
                break;
            default:
                element.value = value;
                // For text inputs and other types, use Forge pattern if available
                if (typeof updateInput === 'function' && (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT')) {
                    updateInput(element);
                } else {
                    this.triggerEvent(element, event);
                }
        }
    },
    // Update input using Gradio's expected event format (works with Forge and new Gradio)
    updateGradioInput: function updateGradioInput(target) {
        if (!target) return;

        // Use the global updateInput if available (Forge/A1111)
        if (typeof updateInput === 'function') {
            updateInput(target);
        }

        // Also dispatch events manually to ensure Svelte/Gradio components update
        // Input event with bubbles
        let inputEvent = new Event("input", { bubbles: true, cancelable: true });
        Object.defineProperty(inputEvent, "target", { value: target });
        target.dispatchEvent(inputEvent);

        // Change event
        let changeEvent = new Event("change", { bubbles: true, cancelable: true });
        target.dispatchEvent(changeEvent);

        // For Svelte components, also try InputEvent
        try {
            let inputEvent2 = new InputEvent("input", {
                bubbles: true,
                cancelable: true,
                inputType: "insertText",
                data: target.value
            });
            target.dispatchEvent(inputEvent2);
        } catch (e) {
            // InputEvent might not be supported in all browsers
        }
    },

    // Set value using native setter to bypass framework reactivity issues
    setNativeValue: function setNativeValue(element, value) {
        // Get the native value setter
        const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set ||
                           Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set ||
                           Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

        if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }
    },

    // Update a Gradio slider component - matches exact Forge pattern
    updateGradioSlider: function updateGradioSlider(container, value) {
        if (!container) return;

        let numberInput = container.querySelector('input[type=number]');
        let rangeInput = container.querySelector('input[type=range]');

        // Use exact Forge pattern: set .value then call updateInput()
        if (numberInput) {
            numberInput.value = value;
            if (typeof updateInput === 'function') {
                updateInput(numberInput);
            }
        }

        // Also update range for visual sync
        if (rangeInput) {
            rangeInput.value = value;
            if (typeof updateInput === 'function') {
                updateInput(rangeInput);
            }

            // Update visual slider fill
            let min = parseFloat(rangeInput.min) || 0;
            let max = parseFloat(rangeInput.max) || 100;
            let val = parseFloat(value) || 0;
            let percentage = ((val - min) / (max - min)) * 100;
            rangeInput.style.backgroundSize = percentage + '% 100%';
        }
    },
    onContentChange: function onContentChange(targetNode, func) {
        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    func(targetNode);
                }
            }
        });
        observer.observe(targetNode, {
            childList: true,
            characterData: true,
            subtree: true
        });
    },
    handleSelect: function handleSelect(select, id, store) {
        try {
            let value = store.get(id);

            if (value) {
                selectingQueue += 1;
                setTimeout(() => {
                    let input = select.querySelector('input');
                    state.utils.triggerMouseEvent(input, 'focus');

                    setTimeout(() => {
                        let items = Array.from(select.querySelectorAll('ul li'));
                        items.forEach(li => {
                            if (li.lastChild.wholeText.trim() === value) {
                                state.utils.triggerMouseEvent(li, 'mousedown');
                                return false;
                            }
                        });
                        state.utils.triggerMouseEvent(input, 'blur');
                        selectingQueue -= 1;
                    }, 100);
                }, selectingQueue * 200)
            }

            setTimeout(() => {
                state.utils.onContentChange(select, function (el) {
                    // Use compatibility helper to get dropdown value
                    var value = state.utils.getDropdownValue(el);
                    if (value) {
                        store.set(id, value);
                    }
                });

                // Also listen to input events directly for Gradio 4.x
                let input = select.querySelector('input');
                if (input) {
                    input.addEventListener('change', function() {
                        if (this.value) {
                            store.set(id, this.value);
                        }
                    });
                }
            }, 150);
        } catch (error) {
            console.error('[state]: Error:', error);
        }
    },
    handleMultipleSelect: function handleMultipleSelect(select, id, store) {
        try {
            let value = store.get(id);

            if (value) {

                value = value.split(',').reverse();

                if (value.length) {

                    let input = select.querySelector('input');

                    let selectOption = function () {

                        if (! value.length) {
                            state.utils.triggerMouseEvent(input, 'blur');
                            return;
                        }

                        let option = value.pop();
                        state.utils.triggerMouseEvent(input, 'focus');

                        setTimeout(() => {
                            let items = Array.from(select.querySelectorAll('ul li'));
                            items.forEach(li => {
                                if (li.lastChild.wholeText.trim() === option) {
                                    state.utils.triggerMouseEvent(li, 'mousedown');
                                    return false;
                                }
                            });
                            setTimeout(selectOption, 100);
                        }, 100);
                    }
                    selectOption();
                }
            }
            state.utils.onContentChange(select, function (el) {
                // Use compatibility helper to get multi-select values
                const selected = state.utils.getMultiSelectValues(el);
                store.set(id, selected);
            });
        } catch (error) {
            console.error('[state]: Error:', error);
        }
    },
    txtToId: function txtToId(txt) {
        return txt.split(' ').join('-').toLowerCase();
    },
    callXTimes: function callXTimes(func, times) {
        let called = 0;
        return function() {
            if (called < times) {
                called++;
                return func.apply(this);
            }
        }
    },
    saveFile: function saveJSON(fileName ,data) {
        const json = JSON.stringify(data, null, 4);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName + '.json';
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },
    debounce: function debounce(func, delay) {
        let lastCallTime = 0;
        return function() {
            const currentCallTime = new Date().getTime();
            if (currentCallTime - lastCallTime > delay) {
                lastCallTime = currentCallTime;
                func.apply(this, arguments);
            }
        }
    },
    onNextUiUpdates: function (func) {
        // brute force this to to ensure that the method is called after next few updates
        onUiUpdate(this.callXTimes(function () { setTimeout(func, 5); }, 150));
    }
};

state.utils.html = {
    setStyle: function setStyle(elements, style) {
        if (elements instanceof NodeList) {
            elements = Array.from(elements);
        } else if (elements instanceof Node){
            elements = [elements];
        } else {
            return;
        }
        elements.forEach(element => {
            for (let key in style) {
                if (style.hasOwnProperty(key)) {
                    element.style[key] = style[key];
                }
            }
        });
    },
    create: function create(type, props, style) {
        const element = document.createElement(type);
        if (props) {
            for (let key in props) {
                if (props.hasOwnProperty(key)) {
                    element[key] = props[key];
                }
            }
        }
        if (style) {
            this.setStyle(element, style);
        }
        return element;
    },
    createButton: function createButton(text, onclick) {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.onclick = onclick || function () {};
        // Support both old Gradio 3.x and new Gradio 4.x button classes
        btn.className = state.utils.getButtonClass();
        return btn;
    },
    // Get the appropriate button class based on Gradio version
    getButtonClass: function() {
        return state.utils.getButtonClass();
    }
};

// Gradio version detection and compatibility helpers
state.utils.gradio = {
    _version: null,
    _detected: false,

    // Detect Gradio version based on available DOM elements/classes
    detectVersion: function() {
        if (this._detected) return this._version;

        var root = gradioApp();

        // Check for Gradio 4.x indicators
        if (root.querySelector('.gradio-container-4-')) {
            this._version = 4;
        } else if (root.querySelector('[class*="gradio-container-4"]')) {
            this._version = 4;
        } else if (root.querySelector('.svelte-')) {
            // Gradio 4.x uses svelte classes
            this._version = 4;
        } else {
            // Default to 3.x for older versions
            this._version = 3;
        }

        this._detected = true;
        state.logging.log('Detected Gradio version: ' + this._version + '.x');
        return this._version;
    },

    isVersion4: function() {
        return this.detectVersion() >= 4;
    }
};

// Get button class with fallback support
state.utils.getButtonClass = function() {
    var root = gradioApp();
    // Try to find an existing button and copy its class
    var existingBtn = root.querySelector('#quicksettings button');
    if (existingBtn && existingBtn.className) {
        return existingBtn.className;
    }
    // Fallback class names - try both old and new
    if (state.utils.gradio.isVersion4()) {
        return 'lg primary gradio-button svelte-cmf5ev';
    }
    return 'gr-button gr-button-lg gr-button-primary';
};

// Find dropdown elements with fallback selectors
state.utils.findDropdowns = function(container) {
    container = container || gradioApp();
    // Try multiple selectors for compatibility
    var dropdowns = container.querySelectorAll('.gradio-dropdown');
    if (!dropdowns.length) {
        dropdowns = container.querySelectorAll('[data-testid="dropdown"]');
    }
    if (!dropdowns.length) {
        dropdowns = container.querySelectorAll('.dropdown');
    }
    return dropdowns;
};

// Find accordion elements with fallback selectors
state.utils.findAccordions = function(container) {
    container = container || gradioApp();
    var accordions = container.querySelectorAll('.gradio-accordion');
    if (!accordions.length) {
        accordions = container.querySelectorAll('.accordion');
    }
    if (!accordions.length) {
        accordions = container.querySelectorAll('[data-testid="accordion"]');
    }
    return accordions;
};

// Get selected value from dropdown with version compatibility
state.utils.getDropdownValue = function(select) {
    if (!select) return null;

    // Try new Gradio 4.x input method first
    var input = select.querySelector('input');
    if (input && input.value) {
        return input.value;
    }

    // Try old Gradio 3.x span method
    var selected = select.querySelector('span.single-select');
    if (selected) {
        return selected.textContent;
    }

    // Try other common patterns
    var selectedOption = select.querySelector('.selected');
    if (selectedOption) {
        return selectedOption.textContent;
    }

    return null;
};

// Get multi-select values with version compatibility
state.utils.getMultiSelectValues = function(select) {
    if (!select) return [];

    // Try token pattern (common in both versions)
    var tokens = select.querySelectorAll('.token > span, .token span:first-child');
    if (tokens.length) {
        return Array.from(tokens).map(item => item.textContent);
    }

    // Try secondary-wrap pattern (Gradio 4.x)
    var secondary = select.querySelectorAll('.secondary-wrap .token');
    if (secondary.length) {
        return Array.from(secondary).map(item => item.textContent.trim());
    }

    // Try pill/tag pattern
    var pills = select.querySelectorAll('.pill, .tag, [data-value]');
    if (pills.length) {
        return Array.from(pills).map(item => item.textContent || item.dataset.value);
    }

    return [];
};

// Check if accordion is open with version compatibility
state.utils.isAccordionOpen = function(accordion) {
    if (!accordion) return false;

    var labelWrap = accordion.querySelector('.label-wrap');
    if (labelWrap) {
        // Check for 'open' class (Forge/A1111 style)
        if (labelWrap.classList.contains('open')) {
            return true;
        }
    }

    // Check for input-accordion-open class
    if (accordion.classList.contains('input-accordion-open')) {
        return true;
    }

    // Check icon rotation (older pattern)
    var icon = accordion.querySelector('.transition, .icon');
    if (icon) {
        var transform = icon.style.transform || window.getComputedStyle(icon).transform;
        if (transform && transform.indexOf('90') === -1) {
            return true;
        }
    }

    return false;
};
