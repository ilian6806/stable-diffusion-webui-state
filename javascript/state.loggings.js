window.state = window.state || {};
state = window.state;

state.logging = {

    name: 'state',

    log: function (message) {
        console.log(`[${this.name}]: `, message);
    },

    error: function (message) {
        console.error(`[${this.name}]: `, message);
    },

    warn: function (message) {
        console.warn(`[${this.name}]: `, message);
    }
};
