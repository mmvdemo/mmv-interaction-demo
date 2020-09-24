import * as PARA from "./parameters.js";
import {createGridGeometry,createBackgroundTexture,createLineChartsTexture} from "./utils.js";
let d=10;
let focusPos = {'w':-1,'h':-1};
let focusPos_pix = {'w':-1,'h':-1};
let quad;
const vertexSrc = `

    precision mediump float;

    attribute vec2 aVertexPosition;
    attribute vec2 aUvs;

    uniform mat3 translationMatrix;
    uniform mat3 projectionMatrix;

    varying vec2 vUvs;

    void main() {
        vUvs = aUvs;
        gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

        }`;

const fragmentSrc = `

    precision mediump float;

    varying vec2 vUvs;

    uniform sampler2D uSampler2;

    void main() {
        gl_FragColor = texture2D(uSampler2, vUvs);
                }`;
function bufferIndex(h,w) {return h*(PARA.table.w+1)+w;}
function g1(Dmax,Dnorm) {
    let g=0;
    if(Dnorm!=0) {
        g = (d+1)/(d+Dmax/Dnorm);
    }
    return g;
}
function getCartesianPosition(s,foc,x) {
    let sign,Dmax;
    if(x<foc) {
        Dmax = foc;
        sign = -1;
    } else {
        Dmax = PARA.table[s]-foc;
        sign = 1;
    }
    let scale = g1(Dmax,Math.abs(x-foc));
    return (foc+sign*Dmax*scale)*PARA.step_pix[s];
}
function binSearch(n,s,lo,hi) {
    while(lo<hi) {
        let mi = Math.floor((lo+hi)/2);
        if(n<getCartesianPosition(s,focusPos[s],mi)) {
            hi=mi;
        } else {
            lo = mi+1;
        }
    }
    return lo-1;
}
function updateQuad(h,w) {
    focusPos.h = h>PARA.table.h/2?h+1:h;
    focusPos.w = w>PARA.table.w/2?w+1:w;
    
    const buffer = quad.geometry.getBuffer('aVertexPosition');
    for(let i=0;i<=PARA.table.h;i++) {
        for(let j=0;j<=PARA.table.w;j++) {
            buffer.data[2*bufferIndex(i,j)+1] = getCartesianPosition('h',focusPos.h,i);
            buffer.data[2*bufferIndex(i,j)] = getCartesianPosition('w',focusPos.w,j);
        }
    }
    buffer.update();
};
let app;
export function loadCartesianLens() {
    const backgroundTexture = createBackgroundTexture(0,0,PARA.table.h-1,PARA.table.w-1);
    const uniforms = {
        uSampler2: backgroundTexture,
    };
    const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, uniforms);
    const geometry = createGridGeometry(PARA.table.h,PARA.table.w);
    quad = new PIXI.Mesh(geometry,shader);
    quad.position.set(0,0);
    
    const container = new PIXI.Container();
    container.interactive = true;
    //let canvas = document.getElementById("mycanvas");
    let canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    app = new PIXI.Application({width:PARA.stage_pix.w, height:PARA.stage_pix.h, antialias:true, view:canvas});
    app.renderer.backgroundColor = PARA.backgroundColor;
    app.stage.interactive = true;
    app.stage.addChild(container);
    container.addChild(quad);
    
    canvas.addEventListener('mousemove',function(evt) {
        const rect = canvas.getBoundingClientRect();
        const mouseOnCanvas = {'h':evt.clientY-rect.top-container.y,'w':evt.clientX-rect.left-container.x};
        let h,w;
        if(focusPos.h<0 || focusPos.w<0) {
            w = Math.floor(mouseOnCanvas.w/PARA.step_pix.w);
            h = Math.floor(mouseOnCanvas.h/PARA.step_pix.h);
        } else {
            w = binSearch(mouseOnCanvas.w,'w',0,PARA.table.w);
            h = binSearch(mouseOnCanvas.h,'h',0,PARA.table.h);
        }
        console.log(`h=${h},w=${w}`);
        if(w<0||h<0||w>=PARA.table.w+1||h>=PARA.table.h+1) {
            return;
        }
        updateQuad(h,w);
    });
}
export function destroyCartesianLens() {
    app.destroy(true,true);
}
