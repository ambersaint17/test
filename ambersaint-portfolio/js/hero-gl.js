/* js/hero-gl.js - The amber halo.
   A resin torus floats over the name. Its far arc passes BEHIND the letters, its near arc passes IN FRONT and refracts them,
   tinted like amber, with trapped flecks, bubbles, a specular highlight and a caustic it throws on the page.
   The DOM headline stays real text (selectable, accessible, animated by GSAP); this canvas only paints the ring and its light.
   To know where the letters are, the headline is redrawn into an offscreen canvas at the exact DOM positions and used as a texture.
   API: window.Halo = { init(), show(), setBg(hex), ok } */
(function () {
  'use strict';
  var cv = document.getElementById('haloGL');
  var hero = document.getElementById('top');
  var Halo = (window.Halo = { ok: false, init: init, show: show, setBg: setBg });
  if (!cv || !hero) return;

  var gl = null, prog = null, tex = null, U = {}, W = 0, H = 0, DPR = 1;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var running = false, visible = true, t0 = performance.now(), last = 0;
  var state = { show: 0, showT: 0, cx: 0, cy: 0, tx: 0, ty: 0, rx: 0, tilt: 0.34, tiltT: 0.34, rot: -0.15, rotT: -0.15, lx: 0, ly: 0, scroll: 0 };
  var base = { cx: 0, cy: 0, rx: 0 };
  var bg = [11 / 255, 9 / 255, 7 / 255], bgT = bg.slice();
  var tiltEl = document.getElementById('haloTilt'), rotEl = document.getElementById('haloRot'), frame = 0;

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform sampler2D uText;uniform vec2 uRes;uniform float uTime;uniform vec2 uC;uniform vec2 uAB;uniform float uR;',
    'uniform float uRot;uniform vec2 uL;uniform float uShow;uniform vec3 uBg;',
    'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}',
    'float T(vec2 px){return texture2D(uText,px/uRes).a;}',
    'float ell(vec2 p,vec2 ab){float k0=length(p/ab);float k1=length(p/(ab*ab));return k0*(k0-1.)/max(k1,1e-4);}',
    'void main(){',
    '  vec2 fc=gl_FragCoord.xy;',
    '  float c=cos(uRot),s=sin(uRot);',
    '  vec2 p=fc-uC; p=vec2(c*p.x+s*p.y,-s*p.x+c*p.y);',          // into ring space
    '  float d=ell(p,uAB);',
    '  float r=uR*uShow;',
    '  vec3 amber=vec3(1.,.56,.1);',
    '  vec4 ring=vec4(0.);',
    '  float tt=d/max(r,1e-3);',
    '  if(abs(tt)<1.){',
    '    float h=sqrt(1.-tt*tt);',
    '    vec2 g=normalize(p/(uAB*uAB)+1e-5);',
    '    vec2 nr=g*tt;',
    '    vec2 ns=vec2(c*nr.x-s*nr.y,s*nr.x+c*nr.y);',                 // back to screen space
    '    vec3 n=normalize(vec3(ns,h*1.05));',
    '    vec2 off=-n.xy*uR*1.7*(1.-h*.3);',
    '    float ca=uR*.025;',
    '    vec3 txt=vec3(T(fc+off),T(fc+off*1.06+vec2(ca,0.)),T(fc+off*1.12+vec2(2.*ca,0.)));',
    '    vec3 seen=mix(uBg,vec3(.95,.91,.86),txt);',
    '    vec3 absorb=exp(-h*vec3(.08,.55,1.9)*1.1);',
    '    vec3 body=mix(vec3(.62,.24,.03),vec3(1.,.68,.24),h*.7+.2);',
    '    vec3 col=seen*absorb*1.15+body*(.42+.28*h);',
    '    float ang=atan(p.y/uAB.y,p.x/uAB.x);',
    '    vec2 ip=vec2(ang*7.+uTime*.035,tt*1.6+uTime*.01);',
    '    float cloud=fbm(ip*2.4);',
    '    col=mix(col,col*vec3(.62,.36,.14),smoothstep(.5,.85,cloud)*.32*h);',
    '    float fl=smoothstep(.8,.86,vn(ip*vec2(10.,6.)+3.1));',
    '    col+=vec3(1.,.82,.45)*fl*.28*h;',
    '    float bu=vn(ip*vec2(26.,15.)+7.3);',
    '    col+=vec3(1.,.96,.85)*smoothstep(.955,.985,bu)*.9*h;',
    '    vec3 L=normalize(vec3(uL.x*.9-.35,uL.y*.6+.6,.8));',
    '    vec3 Hh=normalize(L+vec3(0.,0.,1.));',
    '    float nh=max(dot(n,Hh),0.);',
    '    col+=vec3(1.,.94,.82)*(pow(nh,110.)*1.6+pow(nh,14.)*.14);',
    '    col+=amber*pow(1.-max(n.z,0.),2.6)*.75;',
    '    col*=.82+.3*max(dot(n,L),0.);',
    '    float aa=1.-smoothstep(.93,1.,abs(tt));',
    '    float back=smoothstep(-2.,2.,p.y);',                           // far arc sits behind the letters
    '    float a=aa*(1.-back*T(fc))*uShow;',
    '    ring=vec4(col*a,a);',
    '  }',
    '  float o=max(abs(d)-r,0.);',
    '  float glow=(exp(-o/(uR*2.6))*.16+exp(-o/(uR*.55))*.22)*uShow;',
    '  vec2 q=p+vec2(0.,uAB.y*2.1);',                                   // caustic thrown below the ring
    '  float dc=ell(q,uAB*vec2(1.05,.8));',
    '  float caus=exp(-abs(dc)/(uR*1.4))*.12*uShow*(.75+.25*sin(uTime*.6));',
    '  float ta=T(fc);',
    '  vec3 light=amber*(glow+caus)+amber*ta*(glow*1.6+caus*1.4);',
    '  float gr=h21(fc+fract(uTime)*91.)-.5;',
    '  light+=gr*.012*uShow;',
    '  gl_FragColor=ring+vec4(max(light,0.),0.)*(1.-ring.a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[halo] shader', gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function setup() {
    try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    if (!gl) return false;
    var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uText', 'uRes', 'uTime', 'uC', 'uAB', 'uR', 'uRot', 'uL', 'uShow', 'uBg'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.uText, 0);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; document.documentElement.classList.add('no-gl'); }, false);
    return true;
  }

  /* Redraw the headline into a texture at the exact DOM positions (glyph widths are matched with a horizontal scale). */
  function paintText() {
    var tc = document.createElement('canvas'); tc.width = W; tc.height = H;
    var x = tc.getContext('2d'), cr = cv.getBoundingClientRect();
    var lines = hero.querySelectorAll('.ln__in');
    var saved = [];   // measure the resting layout, not a frame of the reveal animation
    for (var j = 0; j < lines.length; j++) { saved.push(lines[j].style.transform); lines[j].style.transform = 'none'; }
    for (var i = 0; i < lines.length; i++) {
      var el = lines[i], cs = getComputedStyle(el), r = el.getBoundingClientRect(), bl = el.querySelector('.bl');
      var size = parseFloat(cs.fontSize) * DPR, text = el.textContent.trim();
      x.font = cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
      // canvas only takes keyword widths: pick the nearest one, the horizontal scale below fixes the rest
      var fsPct = parseFloat(cs.fontStretch) || 100, KW = [[62.5, 'extra-condensed'], [75, 'condensed'], [87.5, 'semi-condensed'], [100, 'normal'], [112.5, 'semi-expanded'], [125, 'expanded']];
      var kw = KW.reduce(function (a, b) { return Math.abs(b[0] - fsPct) < Math.abs(a[0] - fsPct) ? b : a; })[1];
      try { x.fontStretch = kw; } catch (e) { /* older engines: width is fixed by the scale below */ }
      var ls = parseFloat(cs.letterSpacing) || 0;
      if ('letterSpacing' in x) x.letterSpacing = (ls * DPR) + 'px';
      var w = x.measureText(text).width, target = (r.width - (bl ? 0 : 0)) * DPR;
      var baseY = (bl.getBoundingClientRect().top - cr.top) * DPR;
      x.save(); x.translate((r.left - cr.left) * DPR, baseY); x.scale(w ? target / w : 1, 1);
      x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; x.fillText(text, 0, 0); x.restore();
    }
    for (var k = 0; k < lines.length; k++) lines[k].style.transform = saved[k];
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
  }

  function layout() {
    var lite = document.documentElement.classList.contains('lite');
    DPR = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.75);
    var r = cv.getBoundingClientRect();
    W = Math.max(2, Math.round(r.width * DPR)); H = Math.max(2, Math.round(r.height * DPR));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
    var la = hero.querySelector('.ln--a'), lb = hero.querySelector('.ln--b');
    var a = la.getBoundingClientRect(), b = lb.getBoundingClientRect();   // the masks never move, so these are stable
    var mobile = r.width < 720;
    // The halo hovers over the seam between the two lines, slightly right of centre, like it belongs to the name.
    base.rx = (mobile ? 0.36 : 0.205) * r.width * DPR;
    base.cx = ((mobile ? 0.56 : 0.585) * r.width) * DPR;
    var seam = (a.bottom + b.top) / 2 - r.top;
    base.cy = H - (seam - (mobile ? 0.02 : 0.035) * r.height) * DPR;   // GL y is up
    if (!state.cx) { state.cx = base.cx; state.cy = base.cy + 260 * DPR; }
    paintText();
  }

  function setBg(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (m) bgT = [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
  }

  var mouse = { x: 0, y: 0 };
  function onMove(e) { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = -(e.clientY / innerHeight * 2 - 1); }

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (!visible) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var t = (now - t0) / 1000, k = 1 - Math.pow(0.0015, dt), k2 = 1 - Math.pow(0.02, dt);
    var sc = Math.min(1.2, state.scroll);
    // follow the cursor a little, bob gently, and rise "above" as you scroll
    state.tx = base.cx + mouse.x * base.rx * 0.12;
    state.ty = base.cy + mouse.y * base.rx * 0.06 + (reduce ? 0 : Math.sin(t * 0.7) * 6 * DPR) + sc * H * 0.32;
    state.tiltT = 0.34 + mouse.y * 0.07 - sc * 0.12;
    state.rotT = -0.15 + mouse.x * 0.09 + sc * 0.25;
    state.cx += (state.tx - state.cx) * k; state.cy += (state.ty - state.cy) * k;
    state.tilt += (state.tiltT - state.tilt) * k; state.rot += (state.rotT - state.rot) * k;
    state.lx += (mouse.x - state.lx) * k2; state.ly += (mouse.y - state.ly) * k2;
    state.show += (state.showT - state.show) * (1 - Math.pow(0.04, dt));
    for (var i = 0; i < 3; i++) bg[i] += (bgT[i] - bg[i]) * k2;
    var rx = base.rx * (1 + sc * 0.18) * (0.86 + 0.14 * state.show);
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uTime, reduce ? 4 : t);
    gl.uniform2f(U.uC, state.cx, state.cy); gl.uniform2f(U.uAB, rx, rx * state.tilt);
    gl.uniform1f(U.uR, rx * 0.082); gl.uniform1f(U.uRot, state.rot); gl.uniform2f(U.uL, state.lx, state.ly);
    gl.uniform1f(U.uShow, state.show); gl.uniform3f(U.uBg, bg[0], bg[1], bg[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (++frame % 6 === 0 && tiltEl) {
      tiltEl.textContent = 'tilt ' + state.tilt.toFixed(3);
      rotEl.textContent = ((((-state.rot * 180 / Math.PI) % 360) + 360) % 360).toFixed(1) + '°';
    }
  }

  function init() {
    if (Halo.ok) { layout(); return true; }
    if (document.documentElement.classList.contains('no-gl')) return false;
    if (!setup()) { document.documentElement.classList.add('no-gl'); return false; }
    Halo.ok = true;
    layout();
    addEventListener('pointermove', onMove, { passive: true });
    var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(layout, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (Halo.ok) layout(); });
    addEventListener('scroll', function () { state.scroll = scrollY / Math.max(1, hero.offsetHeight); }, { passive: true });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    document.addEventListener('visibilitychange', function () { last = 0; });
    running = true; requestAnimationFrame(tick);
    return true;
  }

  function show() { state.showT = 1; }
})();
