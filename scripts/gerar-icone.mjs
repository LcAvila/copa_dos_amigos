// Gera os ícones do PWA (PNG puro, sem dependências externas).
// Uso: node scripts/gerar-icone.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const CRC_TABELA = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, dados) {
  const comprimento = Buffer.alloc(4)
  comprimento.writeUInt32BE(dados.length, 0)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo), 0)
  return Buffer.concat([comprimento, corpo, crc])
}

function paraPng(largura, altura, rgba) {
  const linha = largura * 4 + 1
  const bruto = Buffer.alloc(linha * altura)
  for (let y = 0; y < altura; y += 1) {
    bruto[y * linha] = 0 // filtro None
    Buffer.from(rgba.buffer, y * largura * 4, largura * 4).copy(bruto, y * linha + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const FUNDO = [4, 7, 15]
const BOLA = [246, 225, 75]
const PENTAGONO = [10, 15, 28]

function pentagono(cx, cy, raio, rotacao) {
  const vertices = []
  for (let i = 0; i < 5; i += 1) {
    const angulo = rotacao + (i * 2 * Math.PI) / 5
    vertices.push([cx + raio * Math.cos(angulo), cy + raio * Math.sin(angulo)])
  }
  return vertices
}

function dentroDoPoligono(x, y, vertices) {
  let dentro = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const [xi, yi] = vertices[i]
    const [xj, yj] = vertices[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

function desenhar(tamanho) {
  const rgba = new Uint8Array(tamanho * tamanho * 4)
  const centro = tamanho / 2
  const raioBola = tamanho * 0.34
  const meia = Math.PI / 5 // pentágono com ponta para cima

  const formas = [pentagono(centro, centro, raioBola * 0.32, -meia)]
  for (let i = 0; i < 5; i += 1) {
    const angulo = -meia * 2 + (i * 2 * Math.PI) / 5
    formas.push(
      pentagono(
        centro + Math.cos(angulo) * raioBola * 0.74,
        centro + Math.sin(angulo) * raioBola * 0.74,
        raioBola * 0.34,
        angulo,
      ),
    )
  }

  for (let y = 0; y < tamanho; y += 1) {
    for (let x = 0; x < tamanho; x += 1) {
      const dx = x + 0.5 - centro
      const dy = y + 0.5 - centro
      const distancia = Math.sqrt(dx * dx + dy * dy)

      let cor = FUNDO
      if (distancia <= raioBola) {
        cor = formas.some((vertices) => dentroDoPoligono(x + 0.5, y + 0.5, vertices))
          ? PENTAGONO
          : BOLA
      }

      const i = (y * tamanho + x) * 4
      rgba[i] = cor[0]
      rgba[i + 1] = cor[1]
      rgba[i + 2] = cor[2]
      rgba[i + 3] = 255
    }
  }
  return rgba
}

const SAIDA = 'public/icons'
mkdirSync(SAIDA, { recursive: true })

for (const tamanho of [180, 192, 512]) {
  const caminho = `${SAIDA}/icon-${tamanho}.png`
  writeFileSync(caminho, paraPng(tamanho, tamanho, desenhar(tamanho)))
  console.log(`gerado: ${caminho}`)
}
