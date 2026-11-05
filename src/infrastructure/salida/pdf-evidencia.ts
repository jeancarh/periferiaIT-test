import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const TAMANO_FUENTE = 11
const MARGEN = 50
const INTERLINEADO = 16
const CARACTERES_POR_LINEA = 90

const aWinAnsi = (texto: string): string => texto.replace(/[^\u0000-ÿ]/g, "?")

const partirLinea = (linea: string): string[] => {
  if (linea.length <= CARACTERES_POR_LINEA) return [linea]
  const palabras = linea.split(" ")
  return palabras.reduce<string[]>((lineas, palabra) => {
    const actual = lineas.at(-1) ?? ""
    if (`${actual} ${palabra}`.trim().length > CARACTERES_POR_LINEA) return [...lineas, palabra]
    return [...lineas.slice(0, -1), `${actual} ${palabra}`.trim()]
  }, [])
}

export const generarPdf = async (titulo: string, contenido: string): Promise<Uint8Array> => {
  const documento = await PDFDocument.create()
  documento.setTitle(titulo)
  const fuente = await documento.embedFont(StandardFonts.Helvetica)
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold)
  let pagina = documento.addPage()
  let y = pagina.getHeight() - MARGEN

  pagina.drawText(aWinAnsi(titulo), { x: MARGEN, y, size: TAMANO_FUENTE + 3, font: negrita, color: rgb(0, 0, 0) })
  y -= INTERLINEADO * 2

  for (const linea of contenido.split("\n").flatMap(partirLinea)) {
    if (y < MARGEN) {
      pagina = documento.addPage()
      y = pagina.getHeight() - MARGEN
    }
    pagina.drawText(aWinAnsi(linea), { x: MARGEN, y, size: TAMANO_FUENTE, font: fuente })
    y -= INTERLINEADO
  }
  return documento.save()
}
