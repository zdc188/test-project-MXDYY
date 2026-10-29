/**
 * 占位美术资源生成器（DES-01 / Q6 风险对策）：
 * 程序化生成小尺寸占位 PNG 与地图 Tiled JSON，正式素材可原路径替换。
 * 用法：node scripts/generate-placeholder-assets.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 最小 PNG 编码器（RGBA，无滤波） ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgbaFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgbaFn(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function solid(color, borderColor) {
  return (x, y, w, h) => {
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    return edge ? [...borderColor, 255] : [...color, 255];
  };
}

// ---- 精灵 ----
const spritesDir = join(root, 'public/assets/sprites');
mkdirSync(spritesDir, { recursive: true });

// 玩家 32×40（蓝色）
writeFileSync(
  join(spritesDir, 'player.png'),
  encodePng(32, 40, (x, y) => solid([64, 129, 233], [24, 60, 140])(x, y, 32, 40))
);
// 敌人 32×32（红色史莱姆形状：圆角主体 + 眼睛）
writeFileSync(
  join(spritesDir, 'enemy.png'),
  encodePng(32, 32, (x, y) => {
    const cx = 16, cy = 20, r = 12;
    if (Math.hypot(x - cx, y - cy) > r) return [0, 0, 0, 0];
    if ((x === 10 || x === 22) && y >= 12 && y <= 16) return [255, 255, 255, 255];
    return [214, 69, 65, 255];
  })
);
// NPC 32×40（绿色）
writeFileSync(
  join(spritesDir, 'npc.png'),
  encodePng(32, 40, (x, y) => solid([86, 175, 90], [30, 96, 46])(x, y, 32, 40))
);
// 图块集 64×32：tile1 草地，tile2 石墙
writeFileSync(
  join(spritesDir, 'tileset.png'),
  encodePng(64, 32, (x, y) => {
    if (x < 32) {
      const checker = ((x >> 3) + (y >> 3)) % 2 === 0;
      return checker ? [96, 160, 88, 255] : [88, 150, 80, 255];
    }
    const gx = x - 32;
    const brick = Math.floor(y / 8) % 2 === 0 ? Math.floor(gx / 16) : Math.floor((gx + 8) / 16);
    const mortar = y % 8 === 0 || gx % 16 === (Math.floor(y / 8) % 2 === 0 ? 0 : 8);
    return mortar ? [110, 110, 118, 255] : [150 + brick * 4, 150, 158, 255];
  })
);

// ---- 地图（30×17 tiles，960×540，Tiled JSON 格式） ----
const W = 30, H = 17, TS = 32;
const ground = new Array(W * H).fill(1);
// 边缘一圈视觉用石墙（碰撞由障碍对象层与世界边界承担）
for (let x = 0; x < W; x++) {
  ground[x] = 2;
  ground[(H - 1) * W + x] = 2;
}
for (let y = 0; y < H; y++) {
  ground[y * W] = 2;
  ground[y * W + W - 1] = 2;
}
// 内部几块视觉石墙 + 对应障碍对象
const wallRects = [
  { id: 1, name: 'wall-north', x: 288, y: 64, width: 96, height: 32 },
  { id: 2, name: 'wall-east', x: 800, y: 128, width: 32, height: 128 },
  { id: 3, name: 'wall-west', x: 128, y: 256, width: 32, height: 96 },
  { id: 4, name: 'wall-center', x: 416, y: 320, width: 128, height: 32 },
  { id: 5, name: 'wall-south', x: 576, y: 480, width: 96, height: 32 }
];
for (const r of wallRects) {
  const tx0 = Math.floor(r.x / TS), ty0 = Math.floor(r.y / TS);
  const tx1 = Math.ceil((r.x + r.width) / TS), ty1 = Math.ceil((r.y + r.height) / TS);
  for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) ground[ty * W + tx] = 2;
}

const mapJson = {
  compressionlevel: -1,
  height: H,
  infinite: false,
  layers: [
    {
      data: ground,
      height: H,
      id: 1,
      name: 'ground',
      opacity: 1,
      type: 'tilelayer',
      visible: true,
      width: W,
      x: 0,
      y: 0
    },
    {
      draworder: 'topdown',
      id: 2,
      name: 'obstacles',
      objects: wallRects.map((r) => ({
        gid: 1,
        height: r.height,
        id: r.id,
        name: r.name,
        rotation: 0,
        type: 'obstacle',
        visible: true,
        width: r.width,
        x: r.x,
        y: r.y
      })),
      opacity: 1,
      type: 'objectgroup',
      visible: true,
      x: 0,
      y: 0
    }
  ],
  nextlayerid: 3,
  nextobjectid: wallRects.length + 1,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.10.2',
  tileheight: TS,
  tilesets: [
    {
      columns: 2,
      firstgid: 1,
      image: '../sprites/tileset.png',
      imagewidth: 64,
      imageheight: 32,
      margin: 0,
      name: 'tileset',
      spacing: 0,
      tilecount: 2,
      tileheight: TS,
      tilewidth: TS
    }
  ],
  tilewidth: TS,
  type: 'map',
  version: '1.10',
  width: W
};

const tilemapDir = join(root, 'public/assets/tilemaps');
mkdirSync(tilemapDir, { recursive: true });
writeFileSync(join(tilemapDir, 'map.json'), JSON.stringify(mapJson, null, 2));

console.log('占位资源已生成：sprites/{player,enemy,npc,tileset}.png + tilemaps/map.json');
