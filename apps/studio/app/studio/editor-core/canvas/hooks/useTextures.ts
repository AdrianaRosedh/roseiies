// apps/studio/app/studio/editor-core/canvas/hooks/useTextures.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { mod } from "../utils/math";

function makeNoiseCanvas(size = 240) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 210 + Math.floor(Math.random() * 30);
    img.data[i + 0] = v;
    img.data[i + 1] = v - 4;
    img.data[i + 2] = v - 10;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,90,60,1)";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return c;
}

function makeLeafSpeckleCanvas(size = 420) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  ctx.clearRect(0, 0, size, size);

  const SHADOW = "rgba(58, 86, 58, 1)";
  const VEIN = "rgba(40, 60, 40, 1)";

  const blobCount = Math.round(size / 18);
  for (let i = 0; i < blobCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;

    const rx = 40 + Math.random() * 130;
    const ry = 25 + Math.random() * 95;
    const rot = (Math.random() * 180) * (Math.PI / 180);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    for (let k = 0; k < 7; k++) {
      ctx.globalAlpha = 0.018;
      ctx.fillStyle = SHADOW;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + k * 7, ry + k * 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.globalAlpha = 0.06;
  for (let i = 0; i < Math.round(size / 60); i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;

    const w = 60 + Math.random() * 160;
    const h = 1.2 + Math.random() * 2.2;
    const rot = (Math.random() * 180) * (Math.PI / 180);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    for (let k = 0; k < 4; k++) {
      ctx.globalAlpha = 0.012;
      ctx.fillStyle = VEIN;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  return c;
}

function makeSoilCanvas(size = 520) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  ctx.fillStyle = "rgb(83, 62, 44)";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 10;
    const a = 0.03 + Math.random() * 0.06;
    const shade = 45 + Math.random() * 50;
    ctx.fillStyle = `rgba(${shade}, ${shade * 0.85}, ${shade * 0.6}, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = 0.06 + Math.random() * 0.12;
    ctx.fillStyle = `rgba(20,15,10,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  return c;
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL("image/png");
  });
}

export function useTextures(args: { stagePos: { x: number; y: number } }) {
  const [noiseImg, setNoiseImg] = useState<HTMLImageElement | null>(null);
  const [leafImg, setLeafImg] = useState<HTMLImageElement | null>(null);
  const [soilImg, setSoilImg] = useState<HTMLImageElement | null>(null);

  const leafSize = 520;
  const noiseSize = 240;

  const leafOffset = useMemo(
    () => ({
      x: mod(-args.stagePos.x * 0.18, leafSize),
      y: mod(-args.stagePos.y * 0.18, leafSize),
    }),
    [args.stagePos.x, args.stagePos.y]
  );

  const noiseOffset = useMemo(
    () => ({
      x: mod(-args.stagePos.x * 0.06, noiseSize),
      y: mod(-args.stagePos.y * 0.06, noiseSize),
    }),
    [args.stagePos.x, args.stagePos.y]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const [nImg, lImg, sImg] = await Promise.all([
        canvasToImage(makeNoiseCanvas(240)),
        canvasToImage(makeLeafSpeckleCanvas(520)),
        canvasToImage(makeSoilCanvas(520)),
      ]);
      if (!alive) return;
      setNoiseImg(nImg);
      setLeafImg(lImg);
      setSoilImg(sImg);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return { noiseImg, leafImg, soilImg, leafOffset, noiseOffset };
}
