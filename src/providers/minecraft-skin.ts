import { createCanvas, type Image, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

export class MinecraftSkinResolveError extends Error {
  constructor(
    public readonly code: | "profile_not_found" | "profile_api_error" | "session_api_error" | "textures_missing" | "skin_missing" | "skin_fetch_error",
    message: string,
  ) {
    super(message);
    this.name = "MinecraftSkinError";
  }
}

type MinecraftProfile = {
  id: string;
  name: string;
};

type SessionProfile = MinecraftProfile & {
  properties: Array<{ name: string; value: string }>;
};

type TexturesPayload = {
  textures?: {
    SKIN?: {
      url?: string;
    };
    CAPE?: {
      url?: string;
    };
  };
};

const OUTPUT_SIZE = 128;

const HEAD_X = 8;
const HEAD_Y = 8;
const HEAD_SIZE = 8;

const HEAD_OVERLAY_X = 40;
const HEAD_OVERLAY_Y = 8;

export async function provideMinecraftSkinEmoji({ username }: { username: string }): Promise<Buffer<ArrayBufferLike>> {
  const skin = await resolveSkin(username);

  const skinCanvas = createCanvas(skin.width, skin.height);
  const skinContext = skinCanvas.getContext("2d");

  skinContext.imageSmoothingEnabled = false;
  skinContext.drawImage(skin, 0, 0);

  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const context = canvas.getContext("2d");

  context.imageSmoothingEnabled = false;

  context.drawImage(skinCanvas, HEAD_X, HEAD_Y, HEAD_SIZE, HEAD_SIZE, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  if (hasHeadOverlay(skinContext)) {
    context.drawImage(skin, HEAD_OVERLAY_X, HEAD_OVERLAY_Y, HEAD_SIZE, HEAD_SIZE, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  }

  return await canvas.encode("png");
}

async function resolveSkin(username: string): Promise<Image> {
  const uuid = (await fetchMinecraftProfile(username)).id;

  const sessionProfile = await fetchSessionProfile(uuid);
  const texturesProperty = sessionProfile.properties.find((property) => property.name === "textures");
  if (!texturesProperty) {
    throw new MinecraftSkinResolveError("textures_missing", `No textures property found for ${username}`);
  }

  const decoded = Buffer.from(texturesProperty.value, "base64").toString("utf-8");
  const textures = JSON.parse(decoded) as TexturesPayload;
  const skinUrl = textures.textures?.SKIN?.url;
  if (!skinUrl) {
    throw new MinecraftSkinResolveError("skin_missing", `No skin URL found for ${username}`);
  }

  const response = await fetch(skinUrl);
  if (!response.ok) {
    throw new MinecraftSkinResolveError("skin_fetch_error", `Failed to fetch skin for ${username}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return await loadImage(buffer);
}

async function fetchMinecraftProfile(username: string): Promise<MinecraftProfile> {
  const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
  if (response.status === 404) {
    throw new MinecraftSkinResolveError("profile_not_found", `Minecraft profile not found for ${username}`);
  } else if (!response.ok) {
    throw new MinecraftSkinResolveError("profile_api_error", `Failed to fetch Minecraft profile for ${username}: ${response.status}`);
  }

  return (await response.json()) as MinecraftProfile;
}

async function fetchSessionProfile(uuid: string): Promise<SessionProfile> {
  const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  if (!response.ok) {
    throw new MinecraftSkinResolveError("session_api_error", `Failed to fetch session profile for ${uuid}: ${response.status}`);
  }

  return (await response.json()) as SessionProfile;
}

function hasHeadOverlay(context: SKRSContext2D): boolean {
  const data = context.getImageData(HEAD_OVERLAY_X, HEAD_OVERLAY_Y, HEAD_SIZE, HEAD_SIZE).data;

  let visible = 0;
  let opaqueBlack = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;

    if (a === 0) {
      continue;
    }

    visible++;

    if (r === 0 && g === 0 && b === 0 && a === 255) {
      opaqueBlack++;
    }
  }

  return visible > 0 && opaqueBlack !== HEAD_SIZE * HEAD_SIZE;
}
