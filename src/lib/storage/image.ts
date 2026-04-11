import sharp from "sharp";

const MAX_DIMENSION = 2048;
const WEBP_QUALITY = 80;

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  format: "webp";
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    data: processed.data,
    width: processed.info.width,
    height: processed.info.height,
    format: "webp",
  };
}
