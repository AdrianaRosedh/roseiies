"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

const vertex = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/**
 * Simple, stable “overlap-based” mesh gradient using ONLY your 5 brand colors.
 * No corridor/capsule masks (avoids visible shapes).
 * Brightness comes from overlap (like your PNG).
 */
const fragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uRes;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return smoothstep(r, 0.0, d);
}

void main() {
  vec2 uv = vUv;

  // aspect-correct coordinates for blob placement
  vec2 p = uv - 0.5;
  p.x *= uRes.x / uRes.y;
  p += 0.5;

  float t = uTime * 0.06;

  // Subtle warp (prevents perfect circles)
  vec2 warp = vec2(
    noise(p * 1.8 + t * 0.4),
    noise(p * 1.8 - t * 0.3)
  );
  p += (warp - 0.5) * 0.035;

  // --- EXACT swatches ---
  vec3 RED      = vec3(226.0,  52.0,  35.0) / 255.0; // #E23423
  vec3 ORANGE   = vec3(253.0, 134.0,   6.0) / 255.0; // #FD8606
  vec3 OFFWHITE = vec3(237.0, 236.0, 232.0) / 255.0; // #EDECE8
  vec3 TEAL     = vec3( 18.0, 187.0, 191.0) / 255.0; // #12BBBF
  vec3 BLACK    = vec3(  1.0,   5.0,   6.0) / 255.0; // #010506

  // --- centers (match PNG intent) ---
  vec2 c_darkTL = vec2(0.18, 0.14);
  vec2 c_white  = vec2(0.10, 0.52);
  vec2 c_orange = vec2(0.18, 0.86);
  vec2 c_red    = vec2(0.52, 0.52);   // center
  vec2 c_teal   = vec2(0.88, 0.78);   // right / lower-right
  vec2 c_darkB  = vec2(0.58, 1.05);   // bottom sweep

  // --- radii (big + soft = your PNG look) ---
  float b_darkTL = blob(p, c_darkTL, 0.95);
  float b_white  = blob(p, c_white,  1.05);
  float b_orange = blob(p, c_orange, 1.05);
  float b_red    = blob(p, c_red,    1.20); // BIG so red is visible/bright
  float b_teal   = blob(p, c_teal,   1.00);
  float b_darkB  = blob(p, c_darkB,  1.20);

  // --- compose (overlap = brightness) ---
  vec3 c = BLACK;

  c = mix(c, OFFWHITE, b_white  * 1.12);
  c = mix(c, ORANGE,   b_orange * 0.88);
  c = mix(c, RED,      b_red    * 1.12);
  c = mix(c, TEAL,     b_teal   * 0.96);

  // dark anchors (soft, not crushing center)
  c = mix(c, BLACK, b_darkTL * 0.32);
  c = mix(c, BLACK, b_darkB  * 0.42);

  // gentle vignette only
  float v = smoothstep(1.10, 0.35, length((uv - 0.5) * vec2(1.15, 1.0)));
  c *= mix(0.92, 1.0, v);

  // exposure / midtone lift so red reads bright like PNG
  c = pow(c, vec3(0.93));

  gl_FragColor = vec4(c, 1.0);
}
`;

export default function FluidGradient() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Force background behavior (prevents layout/scroll weirdness)
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "-10";
    el.style.pointerEvents = "none";
    el.style.overflow = "hidden";
    el.style.background = "#07090b";

    const renderer = new Renderer({ dpr: Math.min(2, window.devicePixelRatio) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    el.appendChild(gl.canvas);
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      program.uniforms.uRes.value = [w, h];
    };

    let raf = 0;
    const loop = (time: number) => {
      program.uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      el.removeChild(gl.canvas);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" />;
}
