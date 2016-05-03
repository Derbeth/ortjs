/*global Ort:false*/
(function(){
    "use strict";

    describe("Ort", () => {
        describe("constructor", () => {
            it("accepts params as a map", () => {
                const ort = new Ort({risky: 1, interpunction: 0, fixAmericanNumbers: true, fixBrs: false});
                expect(ort.risky).toBeTruthy();
                expect(ort.interpunction).toBeFalsy();
                expect(ort.fixAmericanNumbers).toBeTruthy();
                expect(ort.fixBrs).toBeFalsy();
            });
            it("runs with some default settings when called without parameters", () => {
                const ort = new Ort();
                expect(ort.interpunction).toBeTruthy();
            });
        });
        describe("fix()", () => {
            let ort = null;
            beforeEach(() => {
                ort = new Ort();
            });

            it("preserves text with no mistakes", () => {
                const text = "text\nwith no mistakes";
                expect(ort.fix(text)).toEqual(text);
            });

            it("fixes all spelling mistakes in given text", () => {
                expect(ort.fix("Aaron'a 50-cio bajtowy")).toEqual("Aarona 50-bajtowy");
            });

            it("matches words with Polish characters", () => {
                expect(ort.fix("książe 15-kę 8-mą 7-dmy 7-dmą")).toEqual("książę piętnastkę 8. 7. 7.");
            });

            it("can be called many times for wikitext with categories", () => {
                ort.fix("foo\n[[Category:Bar]]\nbaz");
                expect(ort.fix("3-go maja\n[[Category:Maj]]\n[[en:3-go maja]]")).toEqual("3 maja\n[[Kategoria:Maj]]\n[[en:3-go maja]]");
            });
        });
    });
})();
