(function(isNode) {
    "use strict";

    class Ort {
        constructor(params={}) {
            this.params = params;
            this.risky = params.risky === undefined ? true : params.risky;
        }

        fix(text) {
            return text.split("\n").map((line) => this._fixLine(line)).join("\n");
        }

        _fixLine(line) {
            if (!line.match(/<math>/i)) {
                line = this._fixNumerals1(line);
                line = this._fixNumerals2(line);
            }

            line = this._fixApostrophes1(line);
            line = this._fixApostrophes2(line);
            line = this._fixApostrophes3(line);
            line = line.replace(/(Jak|Luk|Mik|[rR]emak|Spik)e('|’|`|-|–|—)(iem|em|m)\b/g, '$1iem');
            line = line.replace(/\[\[([^|\]]*(Luk|Mik|[rR]emak|Spik))e\s*\]\]('|’|`|-|–|—)(em|m)\b/g, '[[$1e|$1iem]]');

            line = line.replace(/\bz pośród\b/g, 'spośród');
            line = line.replace(/\bZ pośród\b/, 'Spośród');

            line = this._addMissingPolishAccents(line);
            return line;
        }

        _fixNumerals1(line) {
            const separator = this.risky ? "( ?[-–—] ?)?" : "( ?- ?|[–—])?";
            return this._safeReplace(line,
                new RegExp(`(\\d|\\b[XIV]+\\b)${separator}(nasto|cio|ro|sto|to|mio|o)[ -]`),
                (match, matches, before) => {
                    if (this._isLinkStart(before)) {
                        return match;
                    }
                    return `${matches[1]}-`;
                }
            );
        }

        // 12-tu -> 12
        _fixNumerals2(line) {
            return this._safeReplace(line,
                /(\d|\b[XIV]+\b)( ?- ?|[–—])?(miu|toma|cioro|ciorga|ciorgiem|cioma|ciu|oro|oma|wu|stu|rech|ech|rgiem|giem|rga|ga|tu|óch|ch|u)\b/,
                (match, matches, before) => {
                    if (this._isLinkStart(before) ||
                        (!this.risky && !matches[2])) {
                        return match;
                    }
                    return matches[1];
                }
            );
        }

        //Jay'a-Z
        _fixApostrophes1(line) {
            return this._safeReplace(line,
                /((?:b|c|d|f|g|h|j|k|l|m|n|p|r|s|t|v|x|w|z|ey|ay|oy|uy|o|ee|i)]?]?)(?:'|’|`|-|–|—)(ach|iem|em|ów|owych|owym|owy|owego|owej|owe|owskimi|owskich|owskiego|owskie|owskim|owski|owcy|owca|owców|owie|owi|ową|ami|ie|ego|go|emu|om|ą|ę|a|i|e|y|mu|m|u)\b/,
                (match, matches, before, after) => {
                    if (!this.risky && after.match(/^-/) ||
                    this._isLinkStart(before) ||
                    `${before}${matches[1]}`.match(/(Barthes|Georges|Gilles|Jacques|Yves)$/)) {
                        return match;
                    }
                    return `${matches[1]}${matches[2]}`;
                }
            );
        }

        // Laurie'mu -> Lauriemu
        _fixApostrophes2(line) {
            return this._safeReplace(line,
                /((ie)]?]?)(?:'|’|`|-|–|—)(go|mu|m)\b(?!-)/,
                (match, matches, before) => {
                    if (this._isLinkStart(before)) {
                        return match;
                    }
                    return `${matches[1]}${matches[3]}`;
                }
            );
        }

        // Selby'ch -> Selbych
        _fixApostrophes3(line) {
            return this._safeReplace(line,
                /([y])(?:'|’|`|-|–|—)(ch)\b(?!-)/,
                (match, matches, before) => {
                    if (this._isLinkStart(before)) {
                        return match;
                    }
                    return `${matches[1]}${matches[2]}`;
                }
            );
        }

        _addMissingPolishAccents(line) {
            if (!this.risky) {
                return line;
            }
            line = line.replace(/\b(imi|książ|mas|par|plemi|zwierz)e\b/, '$1ę');
            return line;
        }

        _safeReplace(line, regex, matchCallback) {
            const matches = regex.exec(line);
            if (matches) {
                const before = this._prematch(line, matches);
                const after = this._postmatch(line, matches);
                line = before
                    + matchCallback(matches[0], matches, before, after)
                    + this._safeReplace(after, regex, matchCallback);
            }
            return line;
        }

        _prematch(string, match) {
            return string.substring(0, match.index);
        }

        _postmatch(string, match) {
            return string.substring(match.index + match[0].length);
        }

        _isLinkStart(text) {
            return text.match(/https?:\/\/\S+$|(Grafika|Image|Plik|File):[^\|]*$/i);
        }
    }

    if (isNode) {
        module.exports = Ort;
    } else {
        window.Ort = Ort;
    }
}(typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof exports !== 'undefined'));
