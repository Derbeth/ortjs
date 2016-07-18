module.exports = function(config) {
    config.set({
        frameworks: ['jasmine'],
        browsers: ['PhantomJS'], // 'Firefox'
        reporters: ['spec'],

        files: [
            'dist/*.js',
            'tmp/test/browser.js'
        ]
    });
};
