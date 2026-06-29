import { fileURLToPath } from "node:url";
import { type Canvas, createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const OUTPUT_SIZE = 128;

const DRAW_SCALE = 4;
const DRAW_SIZE = OUTPUT_SIZE * DRAW_SCALE;

const FONT_WEIGHT = 900;
const FONT_FAMILY = "M PLUS Rounded 1c";
const STROKE_WIDTH = 1.5 * DRAW_SCALE;
const LINE_HEIGHT_RATIO = 0.86;

GlobalFonts.registerFromPath(resolveFontPath(), FONT_FAMILY);

export async function provideTextEmoji({
  text,
  color,
}: {
  text: string;
  color: string;
}): Promise<Buffer<ArrayBufferLike>> {
  const lines = wrapText(text);
  const textCanvas = drawTextToCanvas(lines, color);

  const contentBounds = findContentBounds(textCanvas.getContext("2d"));
  if (!contentBounds) {
    return await createCanvas(OUTPUT_SIZE, OUTPUT_SIZE).encode("png");
  }

  const outputCanvas = await fitCanvasToOutput(textCanvas, contentBounds);
  return await outputCanvas.encode("png");
}

function drawTextToCanvas(lines: string[], textColor: string): Canvas {
  const canvas = createCanvas(DRAW_SIZE, DRAW_SIZE);
  const context = canvas.getContext("2d");
  const fontSize = findMaxFontSize(context, lines);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const firstY = lines.length === 1 ? DRAW_SIZE / 2 : DRAW_SIZE / 2 - lineHeight / 2;

  context.clearRect(0, 0, DRAW_SIZE, DRAW_SIZE);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = textColor;
  context.strokeStyle = textColor;
  context.lineJoin = "round";
  context.lineWidth = STROKE_WIDTH;
  context.font = formatFont(fontSize);

  for (const [index, line] of lines.entries()) {
    const y = firstY + index * lineHeight;
    context.strokeText(line, DRAW_SIZE / 2, y);
    context.fillText(line, DRAW_SIZE / 2, y);
  }

  return canvas;
}

async function fitCanvasToOutput(source: Canvas, bounds: Bounds): Promise<Canvas> {
  const cropped = createCanvas(bounds.width, bounds.height);
  const croppedContext = cropped.getContext("2d");
  croppedContext.drawImage(
    source,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  const output = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const outputContext = output.getContext("2d");
  const image = await loadImage(await cropped.encode("png"));

  const scale = Math.min(OUTPUT_SIZE / bounds.width, OUTPUT_SIZE / bounds.height);
  const width = Math.round(bounds.width * scale);
  const height = Math.round(bounds.height * scale);
  const left = Math.round((OUTPUT_SIZE - width) / 2);
  const top = Math.round((OUTPUT_SIZE - height) / 2);

  outputContext.drawImage(image, left, top, width, height);

  return output;
}

function findMaxFontSize(context: SKRSContext2D, lines: string[]): number {
  let min = 1;
  let max = 180 * DRAW_SCALE;
  let fitted = min;

  const fits = (fontSize: number) => {
    context.font = formatFont(fontSize);

    const maxWidth = Math.max(...lines.map((line) => context.measureText(line).width));
    const totalHeight = fontSize + fontSize * LINE_HEIGHT_RATIO * (lines.length - 1);
    const available = DRAW_SIZE - STROKE_WIDTH * 2;

    return maxWidth + STROKE_WIDTH * 2 <= available && totalHeight + STROKE_WIDTH * 2 <= available;
  };

  while (min <= max) {
    const current = Math.floor((min + max) / 2);

    if (fits(current)) {
      fitted = current;
      min = current + 1;
    } else {
      max = current - 1;
    }
  }

  return fitted;
}

function findContentBounds(context: SKRSContext2D): Bounds | null {
  const imageData = context.getImageData(0, 0, DRAW_SIZE, DRAW_SIZE);

  let left = DRAW_SIZE;
  let top = DRAW_SIZE;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < DRAW_SIZE; y++) {
    for (let x = 0; x < DRAW_SIZE; x++) {
      const alpha = imageData.data[(y * DRAW_SIZE + x) * 4 + 3] ?? 0;

      if (alpha > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) {
    return null;
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function resolveFontPath(): string {
  return fileURLToPath(
    import.meta.resolve("@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-japanese-900-normal.woff"),
  );
}

function formatFont(size: number): string {
  return `${FONT_WEIGHT} ${size}px "${FONT_FAMILY}"`;
}

function wrapText(text: string): string[] {
  const characters = [...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(text)].map(
    (segmentData) => segmentData.segment,
  );

  if (characters.length <= 2) {
    return [characters.join("")];
  }

  const splitAt = Math.ceil(characters.length / 2);
  return [characters.slice(0, splitAt).join(""), characters.slice(splitAt).join("")];
}
