(function() {
    "use strict";

    const Ort = require('../dist/ort.js'),
        fs = require('fs'),
        path = require('path'),
        process = require('process');

    const dir = 'test/data';
    const actualDir = 'tmp';
    const diffCmd = fs.existsSync('/usr/bin/kdiff3') ? 'kdiff3' : ' --unified=2';
    let failed = [];
    const cases = fs.readdirSync(path.resolve(dir)).filter((name) => name.match(/in\d+.txt/)).sort();
    cases.forEach((name) => {
        let index = name.match(/in(\d+).txt/)[1];
        let input = fs.readFileSync(path.resolve(dir, name), 'utf8');
        let expectedPath = path.resolve(dir, `out${index}.txt`);
        let expectedOutput = fs.readFileSync(expectedPath, 'utf8');
        let argumentsPath = path.resolve(dir, `param${index}.json`);
        let params = fs.existsSync(argumentsPath) ?
            JSON.parse(fs.readFileSync(argumentsPath, 'utf8')) :
            {};
        console.log(`Would run with ${JSON.stringify(params)} on ${input.length} to ${expectedOutput.length}`);
        let actualOutput = new Ort(params).fix(input);
        if (expectedOutput !== actualOutput) {
            let actualOuputPath = path.resolve(actualDir, `out${index}.txt`);
            fs.writeFileSync(actualOuputPath, actualOutput);
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

