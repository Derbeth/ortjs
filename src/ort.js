(function(isNode) {
    "use strict";

    class Ort {
        constructor(params={}) {
            this.params = params;
            this.risky = true;
        }

        fix(text) {
            return text.split("\n").map((line) => this._fixLine(line)).join("\n");
        }

        _fixLine(line) {
            line = this._fixNumerals1(line);

            line = line.replace(/(Jak|Luk|Mik|[rR]emak|Spik)e('|’|`|-|–|—)(iem|em|m)\b/g, '$1iem');
            line = line.replace(/\[\[([^|\]]*(Luk|Mik|[rR]emak|Spik))e\s*\]\]('|’|`|-|–|—)(em|m)\b/g, '[[$1e|$1iem]]');

            line = line.replace(/\bz pośród\b/g, 'spośród');
            line = line.replace(/\bZ pośród\b/, 'Spośród');

            line = this._addMissingPolishAccents(line);
            return line;
        }

        _fixNumerals1(line) {
            if (line.indexOf('<math>') !== -1) {
                return line;
            }

            const separator = this.risky ? "( ?[-–—] ?)?" : "( ?- ?|[–—])?";
            const matches = new RegExp(`(\\d|\\b[XIV]+\\b)${separator}(nasto|cio|ro|sto|to|mio|o)[ -]`).exec(line);
            if (matches) {
                const m1 = matches[1];
                let match = matches[0];
                let before = this._prematch(line, matches);
                let after = this._postmatch(line, matches);
                if (!/https?:\/\/\S+$|(Grafika|Image|Plik|File):[^\|]*$/i.exec(before)) {
                    match = `${m1}-`;
                }
                after = this._fixNumerals1(after);
                line = before + match + after;
            }
            return line;
        }

        _addMissingPolishAccents(line) {
            if (!this.risky) {
                return line;
            }
            line = line.replace(/\b(imi|książ|mas|par|plemi|zwierz)e\b/, '$1ę');
            return line;
        }

        _prematch(string, match) {
            return string.substring(0, match.index);
        }

        _postmatch(string, match) {
            return string.substring(match.index + match[0].length);
        }
    }

    if (isNode) {
        module.exports = Ort;
    } else {
        window.Ort = Ort;
    }
}(typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof exports !== 'undefined'));
