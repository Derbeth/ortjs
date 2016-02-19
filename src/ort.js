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

            line = line.replace(/(\b[XIV]+)\. (wiek|wieczn|stuleci)/g, '$1 $2'); // XX. wieku -> XX wieku
            line = line.replace(/((w|W)ieku?) (\b[XIV]+)\./g, '$1 $3'); // wiek XX. -> wiek XX
            line = line.replace(/(\b[XIV]+)( |- | -| - |[–—])(wieczn)/g, '$1-$3'); // XX wieczny -> XX-wieczny

            line = line.replace(/(godzin(a|ie|ą)) (\d+)\.(?!\d)/g, '$1 $3'); // o godzinie 10. -> o godzinie 10
            line = line.replace(/(\d)\. (stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/gi, '$1 $2'); // 1. stycznia -> 1 stycznia
            line = line.replace(/(\d{4})\. (r\.)/g, '$1 $2');

            line = line.replace(/(\d)( ?- ?|[–—])?(set)\b/g, '$1-$3QQQ'); // ostrzeżenie przed 400-set itp.
            line = line.replace(/(\d)(?: ?- ?|[–—])?((?:st|t|)(?:kom|kach|kami|ka|ki|kę|ką|ke|ce|ek))($|\W)/g, '$1-$2QQQ$3'); // ostrzeżenie przed zapisem 12-tka (http://poradnia.pwn.pl/lista.php?id=7010)

            if (!line.match(/<math>/i)) {
                line = this._fixNumerals1(line);
                line = this._fixNumerals2(line);
            }
            line = line.replace(/\b1(?:-|–|—)wszo /g, 'pierwszo');

            const risky_units = this.risky ? 'dzienn|' : '';
            const link_units = '(?:tera|giga|mega|kilo|deka|centy|mili|nano)?(?:bajt|bit|gram|herc|metr)|cal|dolar|frank|funt|galon|hektar|jard|karat|wat|wolt';
            const units = 'lat(?:ek|kami|ka|kiem|ki|ku|ków)'
                + '|lec(?:iu|iem|ie|ia)'
                + '|letn(?:ia|iej|iego|ie|ią|ich|imi|im|i)'
                + `|(?:(?:${link_units})ow|${risky_units}`
                + 'barwn|biegow|bramkow|cylindrow|cyfrow|częściow|dekadow|dniow|drzwiow|dzieln|elementow|etapow|fazow|godzinn|groszow|gwiazdkow|kanałow|kątn|klasow|klawiszow|kołow|komorow|kondygnacyjn|konn|krotn|lufow|masztow|miejscow|miesięczn|miliardow|milionow|minutow|morgow|nabojow|nawow|odcinkow|osiow|osobow|palczast|pasmow|piętrow|pinow|płytow|procentow|procesorow|przęsłow|punktow|ramienn|rdzeniow|roczn|rurow|sekundow|setow|siedzeniow|silnikow|spadow|stopniow|stronn|strunow|strzałow|suwow|ścienn|taktow|tomow|tonow|tygodniow|tysięczn|uncjow|wartościow|wieczn|wymiarow|zaworow|zdaniow|zębow|złotow)'
                + "(?:ych|ymi|ym|ego|emu|ej|[aeyią])";
            const safe_base_numerals = 'dwu|cztero|pięcio|sześcio|siedmio|ośmio|dziewięcio|dziesięcio';
            const unsafe_base_numerals = 'jedno|trój|trzy';
            const base_numerals = `${safe_base_numerals}|${unsafe_base_numerals}`;
            const safe_numerals = safe_base_numerals
                + '|jedenasto|dwunasto|trzynasto|czternasto|piętnasto|szesnasto|siedemnasto|osiemnasto|dziewiętnasto'
                + `|(?:dwudziesto|trzydziesto|czterdziesto|pięćdziesięcio)(?:${base_numerals})?`;
            const numerals = safe_numerals
                + '|' + unsafe_base_numerals
                + '|kilkunasto|kilkuset|półtora|pół|stu|wielo';
            const separator = '(?: | ?[-–—] ?|\\. )';
            line = line.replace(new RegExp(`(\\d)${separator}(${units})($|\\W)`, 'gi'), (m, m1, m2, m3) => `${m1}-${m2.toLowerCase()}${m3}`); // 32 bitowy -> 32-bitowy
            line = line.replace(new RegExp(`(\\d)${separator}(\\[\\[)(${link_units})(\\]\\]ow(?:ego|emu|ych|ymi|ym|ą|e|a|y))($|\\W)`, 'gi'), (m, m1, m2, m3, m4, m5) => `${m1}-${m2}${m3.toLowerCase()}${m4}${m5}`);
            line = line.replace(new RegExp(`\\b(${safe_numerals}) +i +pół +(${units})`, 'gi'), '$1ipół$2'); // http://so.pwn.pl/zasady.php?id=629465
            line = line.replace(new RegExp(`\\b(${numerals})${separator}(${units})($|\\W)`, 'gi'), '$1$2$3'); // sześcio tonowy -> sześciotonowy
            line = line.replace(new RegExp(`\\b(${safe_numerals})-(lub)`, 'gi'), '$1- $2'); // trzy-lub czterokołowy
            if (this.risky) {
                line = line.replace(new RegExp(`\\b(${safe_numerals})((?:, | ))`, 'gi'), '$1-$2') // cztero albo pięciosobowy
            }

            line = line.replace(/(lat(ach|a)?) '(\d\d)/g, '$1 $3.'); // lat '80 -> lat 80.
            line = line.replace(/ '(\d\d)\.(?!\d)/g, ' $1.'); // lat '80. -> lat 80  # '
            line = line.replace(/\b([XIV]{2,})w\./g, '$1 w.'); // XXw. -> XX w.

            line = line.replace('keQQQ', 'kęQQQ');
            const numToWord = {
                10: 'dziesiąt',
                11: 'jedenast',
                12: 'dwunast',
                13: 'trzynast',
                14: 'czternast',
                15: 'piętnast',
                16: 'szesnast',
                17: 'siedemnast',
                18: 'osiemnast',
                19: 'dziewiętnast',
                20: 'dwudziest',
                30: 'trzydziest',
                40: 'czterdziest',
                50: 'pięćdziesiąt',
                60: 'sześćdziesiąt',
                70: 'siedemdziesiąt',
                80: 'osiemdziesiąt',
                90: 'dziewięćdziesiąt'
            };
            Object.keys(numToWord).forEach(num => {
                line = line.replace(new RegExp(num + '( ?- ?|[–—])?((st|t|)(kom|kach|kami|ka|ki|kę|ką|ce|ek))QQQ\\b', 'g'),
                    `${numToWord[num]}$4`);
            });

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
            line = line.replace(/\bZ pośród\b/g, 'Spośród');

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
                + '(?:(?:set|et|t)?(?:na|nej|nego|ne|nym|nych|ny|ną))|'
                + 'wsza|sza|wsze|sze|wszych|szych|dmych|mych|ych|dmy|my|dma|ma|dmą|mą|'
                + 'wszy|szy|me|ego|e|go|y|ą)($|\\W)');
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
                        return `${matches[1]}.${matches[5]}`; // 10-te -> 10.
                    } else {
                        return `${matches[1]}${matches[5]}`; // VI-tym -> IV
                    }
                }
            );
        }

        _fixOrdinals2(line) {
            line = line.replace(/(lat\w* +\d+)( ?[-–—] ?| )(tych|tymi|te)\b/gi, '$1.');
            line = line.replace(/(lat\w* +)1\d(\d0\.)/gi, '$1$2');
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
            line = line.replace(/\b(imi|książ|mas|par|plemi|zwierz)e\b/g, '$1ę');
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
