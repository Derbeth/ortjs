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
            if (this.risky) {
                line = this._fixEnglishYears(line);
            }
            if (!line.match(/<math>/i)) {
                line = this._fixOrdinals(line);
                line = this._fixOrdinals2(line);
            }

            line = line.replace(/(\b[XIV]+)\. (wiek|wieczn|stuleci)/, '$1 $2'); // XX. wieku -> XX wieku
            line = line.replace(/((w|W)ieku?) (\b[XIV]+)\./, '$1 $3'); // wiek XX. -> wiek XX
            line = line.replace(/(\b[XIV]+)( |- | -| - |[–—])(wieczn)/, '$1-$3'); // XX wieczny -> XX-wieczny

            line = line.replace(/(godzin(a|ie|ą)) (\d+)\.(?!\d)/, '$1 $3'); // o godzinie 10. -> o godzinie 10
            line = line.replace(/(\d)\. (stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/i, '$1 $2'); // 1. stycznia -> 1 stycznia
            line = line.replace(/(\d{4})\. (r\.)/, '$1 $2');

            if (!line.match(/<math>/i)) {
                line = this._fixNumerals1(line);
                line = this._fixNumerals2(line);
            }
            line = line.replace(/\b1(?:-|–|—)wszo /, 'pierwszo');

            line = line.replace(/(lat(ach|a)?) '(\d\d)/, '$1 $3.'); // lat '80 -> lat 80.
            line = line.replace(/ '(\d\d)\.(?!\d)/, ' $1.'); // lat '80. -> lat 80  # '
            line = line.replace(/\b([XIV]{2,})w\./, '$1 w.'); // XXw. -> XX w.

            if (this.risky) {
                // 4.. -> 4. but not 4...
                line = this._safeReplace(line,
                    /(\d)\.\./,
                    (match, matches, before, after) => {
                        if (this._isLinkStart(before)
                            || after.match(/^\./)) {
                            return match;
                        }
                        return `${matches[1]}.`;
                    }
                );
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

        // lata 1980-te lub 1970-te
        _fixEnglishYears(line) {
            return this._safeReplace(line,
                /\b1\d(\d0)(\.|( ?- ?|'|–|—)?(tych|te|e))/,
                (match, matches, before, after) => {
                    if (before.match(/(rok\w+\s+|[-–])$/)
                        || after.match(/^\.?(jpg|jpeg|svg|png|gif)\b/i)
                        || match[1] === '00') {
                        return match;
                    }
                    return `${matches[1]}${matches[2]}`;
                }
            );
        }

        _fixOrdinals(line) {
            const separator = this.risky ? "(\\s?[-–—]\\s?|['’`])?" :
                "(\\s?-\\s?|[–—'’`])?";
            const regexp = new RegExp(`(\\d|\\b[XIV]+\\b)(\\]\\])?\\.?${separator}(`
                + 'stym|tym|dmym|mym|wszym|szym|ym|stymi|tymi|ymi|stych|tych|sty|ty|stą|tą|sta|ta|stej|'
                + 'dmej|mej|tej|ej|wszego|szego|wszej|szej|stego|tego|dmego|mego|ste|te|'
                + 'dme|ciego|ciej|cim|cie|cia|cią|ci|gim|im|giego|giej|gie|gi|go|ga|iej|iego|'
                + 'czna|cznej|cznego|czne|cznym|cznych|czny|czną|czna|'
                + '((set|et|t)?(na|nej|nego|ne|nym|nych|ny|ną))|'
                + 'wsza|sza|wsze|sze|wszych|szych|dmych|mych|ych|dmy|my|dma|ma|dmą|mą|'
                + 'wszy|szy|me|e|ego|go|y|ą)\\b');
            return this._safeReplace(line,
                regexp,
                (match, matches, before) => {
                    if (this._isLinkStart(before)
                        || (!this.risky && !matches[3])
                        || (!this.risky && matches[4] === 'na' && matches[3].match(/\s/))
                    ) {
                        return match;
                    }
                    if (matches[1].match(/\d+/)) {
                        return `${matches[1]}.`; // 10-te -> 10.
                    } else {
                        return matches[1]; // VI-tym -> IV
                    }
                }
            );
        }

        _fixOrdinals2(line) {
            line = line.replace(/(lat\w* +\d+)( ?[-–—] ?| )(tych|tymi|te)\b/i, '$1.');
            line = line.replace(/(lat\w* +)1\d(\d0\.)/i, '$1$2');
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
