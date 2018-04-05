"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./Assets/css/_custom.scss");
require("./Assets/css/main.css");
let $ = require("jquery");
window.jQuery = window.$ = $;
require("bootstrap");
require("jquery-ui");
require("./Assets/jquery-ui-1.12.1/jquery-ui.css");
require("./Assets/jquery-ui-1.12.1/jquery-ui.theme.css");
require("./Assets/jquery-ui-1.12.1/jquery-ui.structure.css");
const PIXI = require("pixi.js");
const d3 = require("d3");
const sprites = require("./Components/sprites.json");
const graphics = require("./Components/graphics.json");
const Button_1 = require("./Tools/Button");
const LoaderText_1 = require("./Tools/LoaderText");
const Scale_1 = require("./Tools/Scale");
const DeviceDetect_1 = require("./Tools/DeviceDetect");
let ModalDetail = require("./Components/DetailModal.html");
let ModalSearch = require("./Components/SearchForm.html");
// import * as filters from 'pixi-filters';
class Application extends PIXI.Application {
    constructor(selectorId, width, height) {
        super(width, height, { transparent: true, autoResize: true });
        this.Customloader = new PIXI.loaders.Loader();
        this.Container = new PIXI.Container();
        this.ContainerButtons = new PIXI.Container();
        this.newGraphic = [];
        this._counterGraphic = 0;
        this.newGraphicObj = [];
        this.Circls = [];
        this.zoomTrans = { x: 0, y: 0, k: .1 };
        this.startDrawing = false;
        this.backgroundClicked = false;
        this.sprites = {};
        this.canvas = null;
        this.context = null;
        this.widthCanvas = null;
        this.heightCanvas = null;
        this.D3Interval = null;
        this.isMobile = false;
        this._modeSearh = false;
        this.Container.zIndex = 0;
        this.ContainerButtons.zIndex = 1;
        this.width = width;
        this.height = height;
        this.widthExtentMaximum = this.width + 10000;
        this.heightExtentMaximum = this.width + 10000;
        this.selector = selectorId;
        this.isMobile = DeviceDetect_1.isMobile();
        this.appendView();
        this.setup();
        this.resize();
    }
    appendView() {
        const $this = this;
        document.getElementById($this.selector).appendChild($this.view);
        $("canvas").addClass('row');
        $("canvas").attr('id', 'canvas-container');
        $("canvas").css('margin', '0');
        $("canvas").attr('title', ' ');
        $(document).tooltip({
            track: true,
            context: function () {
                return ' ';
            },
        });
    }
    setup() {
        const $this = this;
        const s = {};
        const text = new LoaderText_1.default($this.width, $this.height);
        $this.stage.addChild(text);
        $this.stage.addChild($this.Container);
        sprites.forEach((e) => {
            $this.Customloader.add(e.name, e.url);
        });
        // loader.pre(cachingMiddleware);
        // loader.use(parsingMiddleware);
        $this.Customloader.load((loader, resources) => {
            Object.keys(resources).map((e) => {
                this.sprites[e] = new PIXI.Sprite(resources[e].texture);
            });
        });
        $this.Customloader.onProgress.add((e) => {
            text.text = `Loading ${e.progress}%`;
        }); // called once per loaded/errored file
        // $this.Customloader.onError.add(() => { }); // called once per errored file
        // $this.Customloader.onLoad.add(() => { }); // called once per loaded file
        $this.Customloader.onComplete.add((e) => {
            $this.stage.removeChild(text);
            $this.addBackground();
            $this.addSearchButton();
            $this.addButtons();
            $this.addGraphics();
            $this.initZoomAction();
            //let colorMatrix = new PIXI.ColorMatrixFilter();
            //colorMatrix.contrast(2);
        });
    }
    addBackground() {
        const $this = this;
        $this.sprites.background.x = 0;
        $this.sprites.background.y = 0;
        $this.sprites.background.interactive = true;
        // const filter = new filters.ColorMatrixFilter();
        //$this.removeColorFromSprite(($this.sprites as any).background);
        $this.sprites.background.on("pointerdown", (e) => {
            if ($this.startDrawing) {
                const x = e.data.global.x;
                const y = e.data.global.y;
                const xD3 = $this.getD3X(x);
                const yD3 = $this.getD3Y(y);
                $this.newGraphic.push([xD3, yD3]);
                $this.Container.removeChild($this.newGraphicObj[$this._counterGraphic]);
                $this.newGraphicObj[$this._counterGraphic] = $this.createGraph($this.newGraphic);
                $this.Container.addChild($this.newGraphicObj[$this._counterGraphic]);
            }
            $this.backgroundClicked = true;
        });
        $this.Container.addChild($this.sprites.background);
    }
    addSearchButton() {
        const $this = this;
        $this.sprites.searchIcon.x = $this.width - 150;
        $this.sprites.searchIcon.y = 50;
        $this.sprites.searchIcon.width = 100;
        $this.sprites.searchIcon.height = 100;
        $this.sprites.searchIcon.interactive = true;
        // let filter = new PIXI.filters.OutlineFilter(2, 0x99ff99);
        // ($this.sprites as any).searchIcon.filters = [filter];
        $this.sprites.searchIcon.on("pointerdown", (e) => {
            let mo = null;
            if ($('.modal.search-modal').length) {
                mo = $('.modal.search-modal');
            }
            else {
                mo = $(ModalSearch);
            }
            mo.modal({ show: true }).on("shown.bs.modal", function (e) {
                $(this).find('form').submit(function () {
                    let data = $(this).serializeArray();
                    data = data.filter((e) => e.value);
                    if (data.length) {
                        $this.removeColorFromSprite($this.sprites.background);
                        $this.modeSearh = true;
                        let dataSearch = {};
                        data.map((e) => {
                            dataSearch[e.name] = e.value;
                        });
                        $this.Graphics.filter((e) => {
                            let { G: dataGraphic, Graph: obj } = e;
                            obj.alpha = 0;
                            if (dataSearch.hasOwnProperty('pieces')) {
                                if (!dataGraphic.info.hasOwnProperty('pieces')) {
                                    return false;
                                }
                                if (!dataGraphic.info.pieces) {
                                    return false;
                                }
                                let sPieces = "S+1";
                                if (dataSearch.pieces == 2) {
                                    sPieces = "S+2";
                                }
                                else if (dataSearch.pieces == 3) {
                                    sPieces = "S+3";
                                }
                                if (dataGraphic.info.pieces != sPieces) {
                                    return false;
                                }
                            }
                            if (dataSearch.hasOwnProperty('surface')) {
                                if (!dataGraphic.info.hasOwnProperty('surface')) {
                                    return false;
                                }
                                if (!dataGraphic.info.surface) {
                                    return false;
                                }
                                let bool = false;
                                let sSurface = dataGraphic.info.surface;
                                if (dataSearch.surface == 1) {
                                    bool = sSurface > 100 && sSurface < 200;
                                }
                                else if (dataSearch.surface == 2) {
                                    bool = sSurface > 200 && sSurface < 300;
                                }
                                else if (dataSearch.surface == 3) {
                                    bool = sSurface > 400;
                                }
                                if (!bool) {
                                    return bool;
                                }
                            }
                            obj.alpha = 1;
                        });
                    }
                    else {
                        $this.removeFiltersFromSprite($this.sprites.background);
                        $this.Graphics.map((e) => {
                            let { Graph: obj } = e;
                            obj.alpha = 0;
                        });
                        $this.modeSearh = false;
                    }
                });
                $(this).find('form select').on('change', function () {
                    $($(this).parents('form')[0]).submit();
                });
            }).on("hidden.bs.modal", function (e) {
                // $(this).remove();
            });
        });
        $this.ContainerButtons.addChild($this.sprites.searchIcon);
    }
    addGraphics() {
        const $this = this;
        const Graphics = [];
        graphics.forEach((G, k) => {
            const coords = G.coords;
            const Graph = $this.createGraph(coords);
            if (Graph) {
                Graph.interactive = true;
                Graph.alpha = 0;
                Graph.mouseover = function () {
                    if (!$this.modeSearh) {
                        this.alpha = 1;
                    }
                    $(document).tooltip("option", "content", "<h1>" + G.info.title + "</h1><p>" + G.info.description + "</p>");
                    $('body').removeClass('tooltip-hidden');
                };
                Graph.mouseout = function () {
                    if (!$this.modeSearh) {
                        this.alpha = 0;
                    }
                    $(document).tooltip("option", "content", ' ');
                    $('body').addClass('tooltip-hidden');
                };
                Graph.pointerdown = function (e) {
                    // console.dir(this);
                    // let xx = this._bounds;
                    // console.dir(xx);
                    // $this.zoomTo(coords[0][0], coords[0][1], 4, Graph);
                    $(ModalDetail).modal({ show: true }).on("shown.bs.modal", function (e) {
                        $(this).find(".modal-title").html(G.info.title);
                        $(this).find(".description").html(G.info.description);
                    }).on("hidden.bs.modal", function (e) {
                        $(this).remove();
                    });
                    if ($this.isMobile) {
                    }
                };
                $this.Container.addChild(Graph);
                Graphics.push({ G, Graph });
            }
        });
        $this.Graphics = Graphics;
    }
    initZoomAction() {
        const $this = this;
        $this.canvas = d3.select(`#${$this.selector} canvas`);
        $this.context = $this.canvas.node().getContext("2d");
        $this.widthCanvas = $this.canvas.property("width");
        $this.heightCanvas = $this.canvas.property("height");
        $this.zoomHandler = d3.zoom()
            .scaleExtent([.1, 8])
            .translateExtent([[0, 0], [$this.widthExtentMaximum, $this.heightExtentMaximum]])
            .on("zoom", () => {
            return $this.zoomActions($this);
        }).filter(() => {
            return !$this.D3Interval;
        });
        const initX = 0;
        const initY = -100;
        $this.canvas.call($this.zoomHandler).call($this.zoomHandler.transform, d3.zoomIdentity.translate(initX, initY).scale(.1));
        $this.canvas.on("click", () => {
            // const x = (d3.event.x - $this.zoomTrans.x) / $this.zoomTrans.k;
            // const y = (d3.event.y - $this.zoomTrans.y) / $this.zoomTrans.k;
        });
    }
    zoomActions($this) {
        const x = d3.event.transform.x;
        const y = d3.event.transform.y;
        const k = d3.event.transform.k;
        $this.zoomTrans = d3.event.transform;
        // let translate = "translate(" + d3.event.translate + ")";
        // let scale = "scale(" + d3.event.scale + ")";
        // $this.canvas.attr("transform", translate + scale);
        $this.Container.scale.set(k);
        $this.Container.position.set(x, y);
    }
    /*private zoomTo(x: number, y: number, k: number, graph) {
     const $this = this;
     const trans = d3.zoomTransform($this.canvas.node());
     const fx = d3.interpolateNumber(364, x);
     const fy = d3.interpolateNumber(0, y);
     const fk = d3.interpolateNumber(trans.k, k);
     let temp = 0;
     $this.D3Interval = d3.interval(function () {
     if (temp < 1) {
     temp += 0.005;
     $this.zoomHandler.scaleBy($this.canvas, fk(temp));
     $this.zoomHandler.translateBy($this.canvas, x, y);
     } else {
     $this.D3Interval.stop();
     $this.D3Interval = null;
     }
     }, 1);
     }*/
    drawCircle(x, y) {
        const $this = this;
        const c = new PIXI.Graphics();
        c.lineStyle(2, 0xFF00FF);
        c.drawCircle(x, y, 5);
        c.endFill();
        $this.Container.addChild(c);
        $this.Circls.push(c);
    }
    removeCircls() {
        const $this = this;
        $this.Circls.map((e) => {
            $this.Container.removeChild(e);
        });
    }
    createGraph(coords) {
        const $this = this;
        if (coords.length) {
            const newGraphicObj = new PIXI.Graphics();
            newGraphicObj.beginFill(0x0000ff, 0.5);
            newGraphicObj.lineStyle(1, 0x0000ff, 1);
            let firstCoord = [];
            coords.map((e) => {
                const [x, y] = e;
                if (!firstCoord.length) {
                    firstCoord = e;
                    newGraphicObj.moveTo(x, y);
                }
                else {
                    newGraphicObj.lineTo(x, e[1]);
                }
            });
            if (firstCoord) {
                const [firstX, firstY] = firstCoord;
                newGraphicObj.lineTo(firstX, firstY);
                newGraphicObj.endFill();
            }
            return newGraphicObj;
        }
        return false;
    }
    addButtons() {
        const $this = this;
        let width = 150;
        let height = 50;
        let x = 10;
        let y = $this.height - height - 20;
        const b = new Button_1.default(width, height, x, y, "Start drawing", null);
        $this.ContainerButtons.addChild(b);
        $this.stage.addChild($this.ContainerButtons);
        b.on("click", () => {
            $this.startDrawing = !$this.startDrawing;
            if (!$this.startDrawing) {
                b.text.text = "Start drawing";
                $this._counterGraphic++;
                $this.newGraphic = [];
            }
            else {
                b.text.text = "Stop drawing";
            }
        });
        width = 250;
        height = 50;
        x = 170;
        y = $this.height - height - 20;
        const returnLastActionB = new Button_1.default(width, height, x, y, "Return to last action", null);
        $this.ContainerButtons.addChild(returnLastActionB);
        returnLastActionB.on("click", () => {
            if ($this.newGraphic.length) {
                $this.newGraphic.splice(-1, 1);
                $this.Container.removeChild($this.newGraphicObj[$this._counterGraphic]);
                $this.newGraphicObj[$this._counterGraphic] = $this.createGraph($this.newGraphic);
                if ($this.newGraphicObj[$this._counterGraphic]) {
                    $this.Container.addChild($this.newGraphicObj[$this._counterGraphic]);
                }
            }
        });
    }
    getD3X(x) {
        const $this = this;
        return (x - $this.zoomTrans.x) / $this.zoomTrans.k;
    }
    getD3Y(y) {
        const $this = this;
        return (y - $this.zoomTrans.y) / $this.zoomTrans.k;
    }
    resize() {
        /*const $this = this;
        $this.rendererResize($this);
        window.addEventListener('resize', () => {
            return $this.rendererResize($this);
        });
        window.addEventListener('deviceOrientation', () => {
            return $this.rendererResize($this);
        });*/
    }
    ;
    rendererResize($this) {
        let { scale, scaleX, scaleY } = Scale_1.scaleToWindow('canvas-container');
    }
    ;
    removeColorFromSprite(sprite) {
        const filter = new PIXI.filters.ColorMatrixFilter();
        sprite.filters = [filter];
        filter.desaturate();
    }
    removeFiltersFromSprite(sprite) {
        sprite.filters = [];
    }
    get modeSearh() {
        return this._modeSearh;
    }
    set modeSearh(value) {
        this._modeSearh = value;
    }
}
exports.default = Application;
window.onload = () => {
    (() => {
        return new Application("container", 1140, 684);
    })();
};
//# sourceMappingURL=App.js.map