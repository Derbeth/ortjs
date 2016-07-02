(function() {
    "use strict";

    const Ort = require('../dist/ort.js'),
        fs = require('fs'),
        path = require('path'),
        process = require('process');

    const dir = 'test/data';
    const actualDir = 'tmp';
    const diffCmd = fs.existsSync('/usr/bin/kdiff3') ? 'kdiff3' : ' --unified=2';
    const failed = [];
    const cases = fs.readdirSync(path.resolve(dir)).filter((name) => name.match(/in\d+.txt/)).sort();
    if (!fs.existsSync(actualDir)) {
        fs.mkdirSync(actualDir);
    }
    cases.forEach((name) => {
        const index = name.match(/in(\d+).txt/)[1];
        const input = fs.readFileSync(path.resolve(dir, name), 'utf8');
        const expectedPath = path.resolve(dir, `out${index}.txt`);
        const expectedOutput = fs.readFileSync(expectedPath, 'utf8');
        const argumentsPath = path.resolve(dir, `param${index}.json`);
        const params = fs.existsSync(argumentsPath) ?
            JSON.parse(fs.readFileSync(argumentsPath, 'utf8')) :
            {};
        console.log(`Would run with ${JSON.stringify(params)} on ${input.length} to ${expectedOutput.length}`);
        const actualOutput = new Ort(params).fix(input);
        const actualOuputPath = path.resolve(actualDir, `out${index}.txt`);
        fs.writeFileSync(actualOuputPath, actualOutput);
        if (expectedOutput !== actualOutput) {
            failed.push(`${diffCmd} ${actualOuputPath} ${expectedPath}`);
        }
    });
    if (failed.length > 0) {
        console.log(`${cases.length} executed, ${failed.length} failed`);
        console.log(failed.join("\n"));
        process.exit(1);
    } else {
        console.log(`${cases.length} executed`);
    }
})();

