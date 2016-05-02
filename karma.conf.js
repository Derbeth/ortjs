module.exports = function(config) {
    config.set({
        frameworks: ['jasmine'],
        browsers: ['PhantomJS', 'SlimerJS'], // 'Firefox'
        reporters: ['spec'],

        files: [
            'dist/*.js',
            'tmp/test/browser.js'
        ]
    });
};
