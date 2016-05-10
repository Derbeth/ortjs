(function(isNode) {
    "use strict";

    class Ort {
        constructor(params={}) {
            this.fixAmericanNumbers = params.fixAmericanNumbers === undefined ? true : params.fixAmericanNumbers;
            this.fixBrs = params.fixBrs === undefined ? true : params.fixBrs;
            this.interpunction = params.interpunction === undefined ? true : params.interpunction;
            this.risky = params.risky === undefined ? true : params.risky;
            this.typography = params.typography === undefined ? true : params.typography;
        }

        fix(text) {
            const parts = text.split(/(\[\[(?:category|kategoria))/i);
            let result = parts[0].split("\n").map((line) => this._fixMainText(line)).join("\n");
            if (parts.length > 1) {
                result += this._fixCategories(parts.splice(1).join(''));
            }
            return result;
        }

        _fixMainText(line) {
            if (this.risky) {
                line = this._fixEnglishYears(line);
            }
            if (!line.match(/<math>/i)) {
                line = this._fixOrdinals(line);
                line = this._fixOrdinals2(line);
            }

            // TODO Roman numbers

            line = line.replace(/(\b[XIV]+)\. (wiek|wieczn|stuleci)/g, '$1 $2'); // XX. wieku -> XX wieku
            line = line.replace(/((w|W)ieku?) (\b[XIV]+)\./g, '$1 $3'); // wiek XX. -> wiek XX
            line = line.replace(/(\b[XIV]+)( |- | -| - |[–—])(wieczn)/g, '$1-$3'); // XX wieczny -> XX-wieczny

            line = line.replace(/(godzin(a|ie|ą)) (\d+)\.(?!\d)/g, '$1 $3'); // o godzinie 10. -> o godzinie 10
            line = line.replace(/(\d)\. (stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)/gi, '$1 $2'); // 1. stycznia -> 1 stycznia
            line = line.replace(/(\d{4})\. (r\.)/g, '$1 $2');

            line = this._fixAmericanNumbers(line);

            if (this.risky) {
                line = line.replace(/(\d)( ?- ?|[–—])?(set)\b/g, '$1-$3QQQ'); // ostrzeżenie przed 400-set itp.
                line = line.replace(/(\d)(?: ?- ?|[–—])?((?:st|t|)(?:kom|kach|kami|ka|ki|kę|ką|ke|ce|ek))($|\W)/g, '$1-$2QQQ$3'); // ostrzeżenie przed zapisem 12-tka (http://poradnia.pwn.pl/lista.php?id=7010)
            }

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
                + 'barwn|biegow|bramkow|cylindrow|cyfrow|częściow|dekadow|dniow|drzwiow|dzieln|elementow|etapow|fazow|godzinn|groszow|gwiazdkow|kanałow|kątn|klasow|klawiszow|kołow|komorow|kondygnacyjn|konn|krotn|lufow|masztow|miejscow|miesięczn|miliardow|milionow|milow|minutow|morgow|nabojow|nawow|odcinkow|osiow|osobow|palczast|pasmow|piętrow|pinow|płytow|procentow|procesorow|przęsłow|punktow|ramienn|rdzeniow|roczn|rurow|sekundow|setow|siedzeniow|silnikow|spadow|stopniow|stronn|strunow|strzałow|suwow|ścienn|taktow|tomow|tonow|tygodniow|tysięczn|uncjow|wartościow|wieczn|wymiarow|zaworow|zdaniow|zębow|złotow)'
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
            line = line.replace(new RegExp(`\\b(${safe_numerals})[ -]+i[ -]+pół[ -]+(${units})`, 'gi'), '$1ipół$2'); // http://so.pwn.pl/zasady.php?id=629465
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

            line = this._fixAcronyms(line);

            line = line.replace(/\B(oy|ey)('|’|`|-|–|—)e?go\b/g, '$1’a');
            line = this._fixApostrophes1(line);
            line = this._fixApostrophes2(line);
            line = this._fixApostrophes3(line);
            line = line.replace(/(Jak|Luk|Mik|[rR]emak|Spik)e('|’|`|-|–|—)(iem|em|m)\b/g, '$1iem'); // Mike'm -> Mikiem
            line = line.replace(/\[\[([^|\]]*(Luk|Mik|[rR]emak|Spik))e\s*\]\]('|’|`|-|–|—)(em|m)\b/g, '[[$1e|$1iem]]'); // [[remake]]'m -> [[remake|remakiem]]
            line = line.replace(/(Luk|Mik|[rR]emak|Spik)e('|’|`|-|–|—)(i)\b/g, '$1i'); // remake'i -> remaki
            line = line.replace(/\[\[([^|\]]*(Luk|Mik|[rR]emak|Spik))e\s*\]\]('|’|`|-|–|—)(i)\b/g, '[[$1e|$1i]]'); // [[remake]]'i -> [[remake|remaki]]
            line = line.replace(/\b(Apocalypti|Benfi|Galacti|Jessi|Metalli|Rebe|Termali)ci\b/g, '$1ki'); // Metallici -> Metalliki
            if (this.risky) {
                line = line.replace(/\bAmici\b/g, 'Amiki');
            }
            line = line.replace(/\B(ell)i(?:'|’|`|-)?(ego|emu)\b/g, '$1$2'); // Botticelliemu -> Botticellemu http://so.pwn.pl/zasady.php?id=629632
            line = line.replace(/\[\[([^\]|]+ell)i\]\](?:'|’|`|-)?(ego|emu)\b/g, '[[$1i|$1$2]]'); // [[Sandro Botticelli]]ego

            line = line.replace(/ieego\b/g, 'iego$1'); // Laurieego -> Lauriego
            line = line.replace(/(Mar|Eri)ciem\b/g, '$1kiem'); // Marciem, Markem -> Markiem, Ericiem -> Erikiem
            line = line.replace(/\b(Mark|Greg)em\b/g, '$1iem');
            line = line.replace(/a('|’|`)([ąęy])($|\W)/g, '$2$3'); //  Laura'y -> Laury
            line = line.replace(/(oe)((?:\]\])?)('|’|`|-)(go|m)\b/g, '$1$2$4'); // Joe'go -> Joego
            line = line.replace(/\Be('|’|`)go\b/g, 'ego'); // Mecke'go -> Meckego
            line = line.replace(/y('|’|`|-|–|—)iego\b/g, 'y’ego'); // Percy'iego -> Percy'ego
            line = line.replace(/y((?:\]\])?)('|’|`|-)m\b/g, 'y$1m'); // Tony'm -> Tonym
            line = this._fixEm(line);
            line = line.replace(/`/g, '’');
            if (this.risky) {
                line = line.replace(/\Bt'cie/g, 'cie'); // Kurt'cie -> Kurcie
                line = line.replace(/(\S+)xie\b/g, (match, m1) => {
                    if (match === 'Dixie') {
                        return match;
                    }
                    return `${m1}ksie`;
                }); // Foxie -> Foksie
                line = line.replace(/\[\[([^\]]+)x\]\]ie\b/g, '[[$1x|$1ksie]]'); // [[box]]ie -> [[box|boksie]]
            }
            line = line.replace(/(Burke|Duke|George|Luke|Mike|Pete|Shayne|Spike|Steve)((?:\]\])?)(a|owi)\b/g, '$1$2’$3');
            line = line.replace(/(Boyl|Doyl|Joyc|Lawrenc|Wayn)e?((?:\]\])?)(a|owi)\b/g, '$1e$2’$3');
            line = line.replace(/(Boyl|Doyl|Joyc|Lawrenc|Wayn)e?(em|m)\b/g, '$1e’em');
            line = line.replace(/(Boyl|Doyl|Joyc|Lawrenc|Wayn)e?(\]\])(em|m)\b/g, '$1e$2’em');
            line = line.replace(/(Barr|Dann|Gar|Gretzk|Harr|Perc|Perr|Terr|Timoth)y?(ego|emu)\b/g, '$1y’$2');
            line = line.replace(/\[\[([^|\]]*(Barr|Dann|Gar|Gretzk|Harr|Perc|Perr|Terr|Timoth))y\]\](ego|emu)\b/g, '[[$1y|$1y’$3]]');

            line = line.replace(/(Andrew|Matthew)('|’|`|-|–|—)?(a|em|ie|owi)/g, '$1'); // Andrew'a -> Andrew
            line = line.replace(/(François)('|’|`|-)?(a|em)\b/g, '$1'); // Françoisa -> François

            line = line.replace(/Charles(a|em|owi) de Gaulle/g, 'Charles’$1 de Gaulle');
            line = line.replace(/(Barthes|Jacques|Yves)(owi|em|a)\b/g, '$1’$2');
            line = line.replace(/Yves('|’|`|-)?ie\b/g, 'Ywie');

            // "Koreii", "ziemii"
            line = line.replace(/(bieżni|elektrowni|głębi|jaskini|Korei|powierzchni|pustyni|skoczni|skrobi|uczelni|ziemi)i/gi, '$1');
            // Japoni -> Japonii
            line = line.replace(/\b(Austri|Australi|Algieri|amfibi|Armeni|Belgi|[bB]ibli|Brazyli|Brytani|Bułgari|Cynthi|Estoni|Etiopi|Finlandi|Grenlandi|Hiszpani|Holandi|Irlandi|Islandi|Japoni|Jordani|Jugosławi|laryngologi|lini|Mołdawi|Mongoli|Nigeri|Norwegi|opini|Portugali|Serbi|Słoweni|stomatologi|Szwajcari|Tajlandi|Virgini|Zelandi)($|[^a-zA-Ząćęłńóśżź])/g, '$1i$2');
            // szyji -> szyi
            line = line.replace(/\b(ale|knie|kole|mierze|nadzie|Okrze|ru|szy|Zia)ji\b/gi, '$1i');
            // komuniźmie -> komunizmie
            line = line.replace(/(analfabety|anarchi|buddy|fanaty|faszy|femini|judai|kapitali|katechi|komuni|marksi|masochi|mechani|mesjani|nazi|nihili|oportuni|optymi|organi|pesymi|platoni|pozytywi|protestanty|radykali|romanty|sady|socjali|syndykali|totalitary|trocki)źmie/gi, '$1zmie');

            line = line.replace(/\b(wg|Wg)\./g, '$1');
            line = line.replace(/\b(W|w)\/w\b/g, '$1w.'); // w/w -> ww.
            line = line.replace(/\b(j|J)\/w\b/g, '$1w.'); // j/w -> jw.
            line = line.replace(/\b(j|J)\.w\./g, '$1w.');
            line = line.replace(/\b(W|w)\/g\b/g, '$1g');  // w/g -> wg
            line = line.replace(/\bd\/s\b/g, 'ds.');  // w/g -> wg
            line = line.replace(/\bdr\.\b/g, 'dr'); // dr. -> dr

            if (this.risky) {
                line = line.replace(/\bnr\.(\d)/g, 'nr $1'); // nr.10 -> nr 10
                line = line.replace(/\b(nr|Nr|mgr|Mgr|mjr|Mjr|ppłk|Ppłk|płk|Płk)\./g, '$1');
            }

            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z pośród($|[^a-zA-Ząćęłńóśżź])/g, '$1spośród$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z pośród($|[^a-zA-Ząćęłńóśżź])/g, '$1Spośród$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w) śród($|[^a-zA-Ząćęłńóśżź])/g, '$1$2śród$3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w)(?:ogóle|ogule|ogle)\b/g, '$1$2 ogóle');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w) skutek($|[^a-zA-Ząćęłńóśżź])/g, '$1$2skutek$3');
            line = line.replace(/\bspowrotem\b/g, 'z powrotem');
            line = line.replace(/\bSpowrotem\b/g, 'Z powrotem');
            line = line.replace(/\bspowodu\b/g, 'z powodu');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z nad($|[^a-zA-Ząćęłńóśżź])(?!wyraz)/g, '$1znad$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z nad($|[^a-zA-Ząćęłńóśżź])(?!wyraz)/g, '$1Znad$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z przed($|[^a-zA-Ząćęłńóśżź])/g, '$1sprzed$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z przed($|[^a-zA-Ząćęłńóśżź])/g, '$1Sprzed$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z poza($|[^a-zA-Ząćęłńóśżź])/g, '$1spoza$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z poza($|[^a-zA-Ząćęłńóśżź])/g, '$1Spoza$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(p|P)onad to($|[^a-zA-Ząćęłńóśżź])/g, '$1$2onadto$3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(p|P)o środku($|[^a-zA-Ząćęłńóśżź])/g, '$1$2ośrodku$3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z pod($|[^a-zA-Ząćęłńóśżź])/g, '$1spod$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z pod($|[^a-zA-Ząćęłńóśżź])/g, '$1Spod$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z\s?tąd($|[^a-zA-Ząćęłńóśżź])/g, '$1stąd$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z\s?tąd($|[^a-zA-Ząćęłńóśżź])/g, '$1Stąd$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z tamtąd\b/g, '$1stamtąd');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z tamtąd\b/g, '$1Stamtąd');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])z nikąd\b/g, '$1znikąd');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])Z nikąd\b/g, '$1Znikąd');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Na|na) codzień\b/g, '$1$2 co dzień');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Po|po)prostu\b/g, '$1$2 prostu');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Na|na)pewno\b/g, '$1$2 pewno');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Co|co)najmniej\b/g, '$1$2 najmniej');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Na|na)razie\b/g, '$1$2 razie');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Od|od)razu($|[^a-zA-Ząćęłńóśżź])/g, '$1$2 razu$3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Na|na) codzień\b/g, '$1$2 co dzień');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Co|co) dzienn(ych|ymi|ym|ie|ej|e|y|a|ą)/g, '$1$2dzienn$3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Na|na) prawdę/g, '$1$2prawdę');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Na|na) przeciwko\b/g, '$1$2przeciwko');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Do|do) okoła\b/g, '$1$2okoła');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])poraz\b/g, '$1po raz');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])([Ww])(głąb|skład)\b/g, '$1$2 $3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(Do|do) tond\b/g, '$1$2tąd');
            line = line.replace(/\b(?:stond|z tąd|z tond)\b/g, 'stąd');
            line = line.replace(/\b(?:Stond|Z tąd|Z tond)\b/g, 'Stąd');
            line = line.replace(/\bwszechczasów\b/g, 'wszech czasów');
            line = line.replace(/\b((s|S)tandar)t(owymi|owym|owy|owa|owych|owe|ową|ów|om|u|y)?($|[^a-zA-Ząćęłńóśżź])/g, '$1d$3$4');
            line = line.replace(/\bstandarcie\b/g, 'standardzie');
            line = line.replace(/\b(P|p)ożąd(ek|ku|kiem)\b/g, '$1orząd$2');
            line = line.replace(/\bna prawdę/g, 'naprawdę');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w) raz z\b/g, '$1$2raz z');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w) skutek\b/g, '$1$2skutek');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w)razie\b/g, '$1$2 razie');
            line = line.replace(/\b(N|n)ie dług(o|i)\b/g, '$1iedług$2');
            line = line.replace(/\b(P|p)oprostu\b/g, '$1o prostu');

            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])tą (mapę|jaskinię)/g, '$1tę $2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])bieże($|[^a-zA-Ząćęłńóśżź])/g, '$1bierze$2');
            line = line.replace(/\b(a|A)bsorbcj(a|i|ą)($|[^a-zA-Ząćęłńóśżź])/g, '$1bsorpcj$2$3');
            line = line.replace(/\b(b|B)ierząc(ej|ych|ego|ym|o|y|a)\b/g, '$1ieżąc$2');
            line = line.replace(/\b(C|c)jan(ku|ek|owodór|owodoru)\b/g, '$1yjan$2');
            line = line.replace(/\b(F|f)ir(nam|man)en(tem|tu|cie|t)\b/g, '$1irmamen$3');
            line = line.replace(/\bfrancuzk(iego|imi|im|ich|iej|ie|a|i|ą)/g, 'francusk$1');
            line = line.replace(/(ł|Ł)abądź($|[^a-zA-Ząćęłńóśżź])/g, '$1abędź$2');
            line = line.replace(/\bgodź\. /g, 'godz. ');
            line = line.replace(/\bludzią($|[^a-zA-Ząćęłńóśżź])/g, 'ludziom$1');
            line = line.replace(/\błać\./g, 'łac.');
            // 100 mln. dolarów -> 100 mln dolarów
            line = line.replace(/\bmln\. ([a-ząćęłńóśżź])/g, 'mln $1');
            // możnaby...
            line = line.replace(/\b([mM])o[zż]naby\b/g, '$1ożna by');
            line = line.replace(/\b(O|o)rgina(łu|łów|ły|łem|łami|ł|lni|lnych|lny|lna|lnej|lnego|lnymi|lnym|lną|lne)/g, '$1rygina$2');
            line = line.replace(/\b(P|p)iersz(ymi|ym|ych|ej|ego|a|y|e|ą)($|[^a-zA-Ząćęłńóśżź])/g, '$1ierwsz$2$3');
            line = line.replace(/\b(p|P)ojedyńcz(ego|ymi|ym|ych|ej|e|y|ą|a|o)($|[^a-zA-Ząćęłńóśżź])/g, '$1ojedyncz$2$3');
            line = line.replace(/\b(p|P)ożąd(ek|ku|kiem|kowy)\b/g, '$1orząd$2');
            line = line.replace(/\b(P|p)zrez\b/g, '$1rzez');
            line = line.replace(/\b(R|r)ownie(ż|z)($|[^a-zA-Ząćęłńóśżź])/g, '$1ównież$3');
            line = line.replace(/\bsciśle\b/g, 'ściśle');
            line = line.replace(/\b(S|s)pógłos(ce|ek|kom|kami|kach|ka|ki)\b/g, '$1półgłos$2');
            line = line.replace(/\bszweck(iego|imi|im|ich|iej|ie|a|i|ą)($|[^a-zA-Ząćęłńóśżź])/g, 'szwedzk$1$2');
            line = line.replace(/\btranzakcj(a|i|om|ę|ami|ach|e)/g, 'transakcj$1');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])tyś\. /g, '$1tys. ');
            line = line.replace(/\bwach(ać|ało|ał|a)($|[^a-zA-Ząćęłńóśżź])/g, 'wah$1$2');
            line = line.replace(/\bwłaść\./g, 'właśc.');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(?:wziąść|wziąźć)($|[^a-zA-Ząćęłńóśżź])/g, '$1wziąć$2');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])(W|w)sród($|[^a-zA-Ząćęłńóśżź])/g, '$1$2śród$3');
            line = line.replace(/(^|[^a-zA-Ząćęłńóśżź])za wyjątkiem\b/g, '$1z wyjątkiem');
            line = line.replace(/\bzarząda(ła|li|ł)($|[^a-zA-Ząćęłńóśżź])/g, 'zażąda$1$2');
            line = line.replace(/\bznaleść($|[^a-zA-Ząćęłńóśżź])/g, 'znaleźć$1');
            line = line.replace(/\b([Zz])wycięsc(a|ów)($|[^a-zA-Ząćęłńóśżź])/g, '$1wycięzc$2$3');
            line = line.replace(/żadko($|[^a-zA-Ząćęłńóśżź])/g, 'rzadko$1');

            line = this._addMissingPolishAccents(line);

            line = line.replace(/\b(v ?- ?ce|vice|wice)[ -]?(\w+)/g, (match, m1, m2) => {
                if (m2.match(/^(?:versa|city)/i)) {
                    return match;
                }
                return `wice${m2.toLowerCase()}`;
            });
            if (this.risky) {
                line = line.replace(/\b(V ?- ?ce|Vice|Wice)[ -]?(\w+)/g, (match, m1, m2) => {
                    if (m2.match(/^(?:versa|city)/i) || match.match(/Vicente|Vicenz/)) {
                        return match;
                    }
                    return `Wice${m2.toLowerCase()}`;
                });
            }

            // uppercase
            if (this.risky) {
                line = line.replace(/(f)(acebook\w)/g, (match, m1, m2) => `${m1.toUpperCase()}${m2}`);
            }

            line = this._fixInterpunction(line);

            line = line.replace(/\b(wschodni|zachodni)o(?:-|–|—| )(północn|południow)/g, '$2o-$1');
            line = line.replace(/\b(wschodn|zachodn)iy/g, '$1i');

            line = line.replace(/(t|T)rash( |-|–|—)metal/g, '$1hrash metal');
            line = line.replace(/\b(art|black|death|doom|glam|gothic|groove|hard|heavy|nu|pop|punk|speed|thrash)( |-)(rock|metal|punk)(owych|owy|owej|owa|owym|owe|ową|owo|owiec)/gi, '$1$3$4');
            line = line.replace(/\[\[(art|black|death|doom|glam|gothic|groove|hard|heavy|nu|pop|punk|speed|thrash)( |-)(rock|metal|punk)\]\](owych|owy|owa|owej|owym|owe|ową|owo|owiec)/g, '[[$1 $3|$1$3$4]]');
            line = line.replace(/hip hop(owym|owy|owa|owej|owym|owe)/g, 'hip-hop$1');
            line = line.replace(/\[\[hip hop\]\](owy|owa|owej|owym|owe)/g, '[[hip hop|hip-hop$1]]');

            line = this._fixTypography(line);
            line = this._fixWikicode(line);

            return line;
        }

        // lata 1980-te lub 1970-te
        _fixEnglishYears(line) {
            return this._safeReplace(line,
                /\b1\d(\d0)(\.|( ?- ?|'|–|—)?(tych|te|e))/,
                (match, matches, before, after) => {
                    if (before.match(/(rok\w+\s+|[-–])$/)
                        || after.match(/^\.?(jpg|jpeg|svg|png|gif)\b/i)
                        || matches[1] === '00') {
                        return match;
                    }
                    return `${matches[1]}${matches[2]}`;
                }
            );
        }

        _fixAcronyms(line) {
            line = line.replace(/\b(d|D)j\b/g, 'DJ');
            // LOTu -> LOT-u
            line = this._safeReplace(line,
                /([a-zA-ZłśżŁŚŻ][A-ZŁŚŻ](?:\]\])?)('|’|`|- | -|–|—)?(ach|ami|zie|ów|ka|etu|ecie|ocie|otu|owych|owym|owy|owi|owa|owe|owców|owcy|owcu|owiec|owcem|owcowi|owcami|owca|ką|kę|(?:(?:ow)?(?:skie|skich|skim|ski|ską))|iem|em|om|ie|i|a|e|ę|u|y)\b(?![a-zćłńóśźż])/,
                (match, matches, before) => {
                    if (this._isLinkStart(before)
                        || (!this.risky && !matches[2])
                        || (`${before}${match}`.match(/(?:kPa|kDa|HiFi|WiFi|TDi|HDi|\bI[a-z]\b)$/))
                    ) {
                        return match;
                    }
                    return `${matches[1]}-${matches[3]}`;
                }
            );
            line = line.replace(/\bsmsy\b/g, 'SMS-y');
            line = line.replace(/\b((MSZ|ONZ)(\]\])?)(-| -|- |'|’|`|–|—)(tu|u)/g, '$1-etu');
            line = line.replace(/\b((MSZ|ONZ)(\]\])?)(-| -|- |'|’|`|–|—)(cie)/g, '$1-ecie');
            line = line.replace(/\b([A-Z]+)T[-–—]ie\b/g, (match, m1) => this._ucfirst(`${m1.toLowerCase()}cie`));
            line = line.replace(/\b([A-Z]+)T\]\][-–—]ie\b/g, (match, m1) => `${m1}T|${this._ucfirst(m1.toLowerCase()+'cie')}]]`);
            line = line.replace(/\b([A-Z]+)X[-–—]ie\b/g, (match, m1) => this._ucfirst(`${m1.toLowerCase()}ksie`));
            line = line.replace(/\b([A-Z]+)X\]\][-–—]ie\b/g, (match, m1) => `${m1}X|${this._ucfirst(m1.toLowerCase()+'ksie')}]]`);
            return line;
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

        // 1.000 -> 1 000; 13,000,000 -> 13 000 000
        _fixAmericanNumbers(line) {
            if (!this.fixAmericanNumbers) {
                return line;
            }
            line = line.replace(/([ (])(\d{1,3})[.,]([50]00)([ )])/g, '$1$2 $3$4');
            line = line.replace(/([ (])(\d{1,3})([,.])(\d\d0)\3(000)([ )])/g, '$1$2 $4 $5$6');
            return line;
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

        // Steve'm -> Steve'em
        _fixEm(line) {
            return this._safeReplace(line,
                /(b|c|d|f|g|h|j|k|l|m|n|p|r|s|t|v|x|w|z)e(\]\])?('|’|`|-|–|—)m\b/,
                (match, matches, before) => {
                    if (this._isLinkStart(before)) {
                        return match;
                    }
                    return `${matches[1]}e${matches[2] || ''}${matches[3]}em`;
                }
            );
        }

        _addMissingPolishAccents(line) {
            if (!this.risky) {
                return line;
            }
            line = line.replace(/\b(imi|książ|mas|par|plemi|zwierz)e\b/g, '$1ę');
            line = line.replace(/\b(B|b)yc\b/g, '$1yć');
            line = line.replace(/\b(B|b)yl\b/g, '$1ył');
            line = line.replace(/\b(C|c)zest(ych|ymi|o|y|ą|a|e)($|\W)/g, '$1zęst$2$3');
            line = line.replace(/\b(D|d)osc\b/g, '$1ość');
            line = line.replace(/\b(D|d)uz(o|y|a|e|ych|ą)($|\W)/g, '$1uż$2$3');
            line = line.replace(/\b(G|g)łown(a|e|i|ych|ymi|y|ą)($|\W)/g, '$1łówn$2$3');
            line = line.replace(/\b(G|g)dyz\b/g, '$1dyż');
            line = line.replace(/\bjak(a|i|ie)s\b/g, 'jak$1ś');
            line = line.replace(/\bktor(zy|ego|ych|ymi|ym|a|ą|y)($|\W)/g, 'któr$1$2');
            line = line.replace(/\bmoze\b/g, 'może');
            line = line.replace(/\b(N|n)astepn(ego|ej|ych|a|e|y|i|ą)($|\W)/g, '$1astępn$2$3');
            line = line.replace(/\b(O|o)procz\b/g, '$1prócz');
            line = line.replace(/\bzaden\b/g, 'żaden');
            line = line.replace(/\b(P|p)ojecie\b/g, '$1ojęcie');
            line = line.replace(/\b(P|p)rzyklad\b/g, '$1rzykład');
            line = line.replace(/\b(W|w)iecej\b/g, '$1ięcej');
            line = line.replace(/\b(W|w)iedze\b/g, '$1iedzę');
            line = line.replace(/\b(W|w)ieksz(ego|emu|ym|ych|ą|a|y|e)($|\W)/g, '$1iększ$2$3');
            line = line.replace(/\b(W|w)i[eę]kszo(?:sc|sć|ść|śc)($|\W)/g, '$1iększość$2');
            line = line.replace(/\b(Z|z)wiaz(ek|ku|kiem)\b/g, '$1wiąz$2');
            return line;
        }

        _fixInterpunction(line) {
            if (!this.interpunction) {
                return line;
            }
            // no space after comma
            line = line.replace(/,(podczas (któr(ych|ej|ego)|gdy|kiedy)|jako że|mimo że|taki jak)\b/g, ', $1');
            line = line.replace(/,((z|bez|od|do|po|dla) (któr(ymi|ym|ej|ego|ych|ym|ą)))/g, ', $1');
            line = line.replace(/ ?,(kiedy|że|któr(ego|ej|ych|ym|y|ą|e)|mimo|chociaż|a|od)/g, ', $1');

            // coś.Niecoś -> coś. Niecoś
            if (this.risky) {
                line = this._safeReplace(line, /([a-ząćęłńóśżź\]])\.([A-ZĄĆĘŁŃÓŚŻŹ])/, (match, matches, before, after) => {
                    if (this._isLinkStart(before) || `${matches[2]}${after}`.match(/^(JPEG|JPG|PNG|GIF)\b/i)) {
                        return match;
                    }
                    return `${matches[1]}. ${matches[2]}`;
                });
            }

            line = line.replace(/\b((?:J|j)ako|(?:m|M)imo), (iż|że)($|[^a-zA-Ząćęłńóśżź])/g, '$1 $2$3');
            line = line.replace(/\b(O|o)d, któr(ego|ej|ych)\b/g, '$1d któr$2');
            line = line.replace(/\bz, któr(ymi|ym|ą)/g, 'z któr$1');
            line = line.replace(/\b(bez|od|do|po|dla), (któr(ej|ego|ych|ym))\b/g, '$1 $2');
            line = line.replace(/, (niż)($|[^a-zA-Ząćęłńóśżź])/g, ' $1$2');
            line = line.replace(/\b([pP]odczas), (któr(ych|ej|ego)|gdy|kiedy)\b/g, '$1 $2');
            line = line.replace(/\btaki, jak\b/g, 'taki jak');
            line = line.replace(/\b([Pp]onadto), (?!że)/g, '$1 ');
            line = line.replace(/([^;>,\-–—]) (podczas (któr(ych|ej|ego)|gdy|kiedy)|jako że|mimo że|taki jak)\b/g, '$1, $2');
            line = line.replace(/([^;>,\-–—]) ((z|bez|od|do|po|dla) (któr(ymi|ym|ej|ego|ych|ym|ą)))/g, '$1, $2');
            // reverse changes
            line = line.replace(/\bco, do któr(ych|ego|ej)\b/g, 'co do któr$1');
            line = line.replace(/\b(zgodnie|wraz), z któr(ymi|ym|ą)/g, '$1 z któr$2');
            line = line.replace(/\bi, (po|od|z) któr(ych|ym|ego|ej)\b/g, 'i $1 któr$2');
            line = line.replace(/\bi, (mimo że)\b/g, 'i $1');
            return line;
        }

        _fixTypography(line) {
            if (!this.typography) {
                return line;
            }
            // 24 - 25 -> 24-25
            line = this._safeReplace(line, /(\d(?:\]\])?) (?:-|–|—|&[mn]dash;) ?((?:\[\[)?\d)/, (match, matches, before) => {
                if (this._isLinkStart(before)) {
                    return match;
                }
                return `${matches[1]}–${matches[2]}`;
            });
            // [[1]]-[[2]] -> [[1]]półpauza[[2]]
            line = this._safeReplace(line, /(^|[ (])((?:\[\[)?\d+(?:\]\])?)-((?:\[\[)?\d+(?:\]\])?)([ )&;,]|$)/, (match, matches, before) => {
                if (this._isLinkStart(before) || before.match(/kod_poczt|^\[\[[^[\]|]+$/) || before.match(/ISBN *$/)) {
                    return match;
                }
                return `${matches[1]}${matches[2]}–${matches[3]}${matches[4]}`;
            });
            // a - b -> a emdash b
            line = this._safeReplace(line, / - /, (match, matches, before) => {
                if (this._isLinkStart(before)) {
                    return match;
                }
                return " – ";
            });
            return line;
        }

        _fixWikicode(line) {
            line = line.replace(/ \]\] /g, ']] ');
            line = line.replace(/ \[\[ /g, ' [[');
            line = line.replace(/\[\[([^|]+)\|\1\]\]/g, '[[$1]]'); //  [[a|a]] -> [[a]], [[a b|a b]] -> [[a b]]
            line = line.replace(/\[\[([^|]+)\|\1(a|e|u|ie|em)\]\]/g, '[[$1]]$2'); //  [[boks|boksu]] -> [[boks]]u

            line = line.replace(/:\s*==/g, '==');
            line = line.replace(/(==\s*)Zobacz także/i, '${1}Zobacz też');
            line = line.replace(/Zewnętrzne linki/i, 'Linki zewnętrzne');
            line = line.replace(/\[\[(Image|Grafika|Plik|File): */gi, '[[Plik:');

            if (this.risky) {
                line = line.replace(/&client=firefox-a/g, '');
            }
            if (this.fixBrs) {
                line = line.replace(/(<br( ?\/)?>){2}/g, "\n\n");
            }
            return line;
        }

        _fixCategories(text) {
            text = text.replace(/\[\[Category:/gi, '[[Kategoria:');
            text = text.replace(/\[\[\s*(?:k|K)ategoria\s*:\s*([^ |\]]+)/g, (match,m1) => `[[Kategoria:${this._ucfirst(m1)}`);
            text = text.replace(/(\]\])\s*(\[\[Kategoria:)/g, '$1\n$2');
            return text;
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

        _ucfirst(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
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
