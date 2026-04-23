const FAVICON_SIZE = 32;
const LINK_ID = "dynamic-favicon";

export type FaviconMode = "auto" | "upload" | "coin_symbol";

function setFaviconHref(href: string, type = "image/png") {
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = type;
  link.href = href;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, bgColor: string) {
  const r = FAVICON_SIZE / 4;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(FAVICON_SIZE - r, 0);
  ctx.quadraticCurveTo(FAVICON_SIZE, 0, FAVICON_SIZE, r);
  ctx.lineTo(FAVICON_SIZE, FAVICON_SIZE - r);
  ctx.quadraticCurveTo(FAVICON_SIZE, FAVICON_SIZE, FAVICON_SIZE - r, FAVICON_SIZE);
  ctx.lineTo(r, FAVICON_SIZE);
  ctx.quadraticCurveTo(0, FAVICON_SIZE, 0, FAVICON_SIZE - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
}

function generateTextFavicon(text: string, bgColor: string, textColor: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  const ctx = canvas.getContext("2d")!;

  drawRoundedRect(ctx, bgColor);

  ctx.fillStyle = textColor;
  ctx.font = `bold ${FAVICON_SIZE * 0.55}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, FAVICON_SIZE / 2, FAVICON_SIZE / 2 + 1);

  return canvas.toDataURL("image/png");
}

function setFaviconFromImage(
  imageUrl: string,
  fallbackName: string,
  bgColor: string,
  textColor: string
) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;
    const ctx = canvas.getContext("2d")!;

    const scale = Math.min(FAVICON_SIZE / img.width, FAVICON_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (FAVICON_SIZE - w) / 2;
    const y = (FAVICON_SIZE - h) / 2;

    ctx.drawImage(img, x, y, w, h);
    setFaviconHref(canvas.toDataURL("image/png"));
  };
  img.onerror = () => {
    setFaviconHref(
      generateTextFavicon(fallbackName.charAt(0).toUpperCase(), bgColor, textColor)
    );
  };
  img.src = imageUrl;
}

export interface DynamicFaviconOptions {
  mode?: FaviconMode;
  faviconUrl?: string | null;
  coinSymbol?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

export function updateFavicon(opts: DynamicFaviconOptions) {
  const mode = opts.mode || "auto";

  if (mode === "upload" && opts.faviconUrl) {
    setFaviconFromImage(opts.faviconUrl, opts.name, opts.primaryColor, opts.secondaryColor);
    return;
  }

  if (mode === "coin_symbol" && opts.coinSymbol) {
    setFaviconHref(
      generateTextFavicon(opts.coinSymbol, opts.primaryColor, opts.secondaryColor)
    );
    return;
  }

  const letter = (opts.name || "A").charAt(0).toUpperCase();
  setFaviconHref(generateTextFavicon(letter, opts.primaryColor, opts.secondaryColor));
}
