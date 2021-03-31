process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function(config) {
    config.set({
        frameworks: ['jasmine'],
        browsers: ['ChromeHeadless'], // 'Firefox'
        reporters: ['spec'],

        files: [
            'dist/*.js',
            'tmp/browser.js'
        ]
    });
};
