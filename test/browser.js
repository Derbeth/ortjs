/*global Ort:false*/
(function(){
    "use strict";

    describe("Ort", () => {
        describe("fix", () => {
            let ort = null;
            beforeEach(() => {
                ort = new Ort();
            });

            it("preserves text with no mistakes", () => {
                let text = "text\nwith no mistakes";
                expect(ort.fix(text)).toEqual(text);
            });

            it("fixes all spelling mistakes in given text", () => {
                expect(ort.fix("Aaron'a 50-cio bajtowy")).toEqual("Aarona 50-bajtowy");
            });
        });
    });
})();
