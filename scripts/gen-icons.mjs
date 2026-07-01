// Генератор иконок приложения без внешних библиотек.
// Рисуем на-бренде: графитовый фон + красная точка-индикатор.
// Выдаёт PNG нужных размеров в public/icons и apple-touch-icon.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const iconsDir = resolve(publicDir, 'icons')
mkdirSync(iconsDir, { recursive: true })

const GRAPHITE = [30, 30, 29]
const RED = [207, 58, 44]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, draw) {
  const bytesPerPixel = 4
  const stride = size * bytesPerPixel
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // фильтр строки: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y)
      const off = y * (stride + 1) + 1 + x * bytesPerPixel
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // глубина
  ihdr[9] = 6 // RGBA
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeIcon(size) {
  const cx = size / 2
  const cy = size / 2
  const dotR = size * 0.14
  return encodePng(size, (x, y) => {
    const dx = x + 0.5 - cx
    const dy = y + 0.5 - cy
    const inDot = dx * dx + dy * dy <= dotR * dotR
    const [r, g, b] = inDot ? RED : GRAPHITE
    return [r, g, b, 255]
  })
}

for (const size of [192, 512]) {
  writeFileSync(resolve(iconsDir, `icon-${size}.png`), makeIcon(size))
}
writeFileSync(resolve(publicDir, 'apple-touch-icon.png'), makeIcon(180))
console.log('Иконки готовы: public/icons/icon-192.png, icon-512.png, apple-touch-icon.png')
