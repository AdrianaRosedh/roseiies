import { useEffect, useState } from "react";

export function useTreeImage(src: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return setImg(null);
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.src = src;

    const onLoad = () => setImg(im);
    const onErr = () => setImg(null);

    im.addEventListener("load", onLoad);
    im.addEventListener("error", onErr);

    return () => {
      im.removeEventListener("load", onLoad);
      im.removeEventListener("error", onErr);
    };
  }, [src]);

  return img;
}
