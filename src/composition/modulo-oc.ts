import { join } from "node:path"
import { ConstruirPayload } from "../application/casos-uso/construir-payload"
import { ConsultarPaquetes } from "../application/casos-uso/consultar-paquetes"
import { CrearOrden } from "../application/casos-uso/crear-orden"
import { GenerarEvidencia } from "../application/casos-uso/generar-evidencia"
import { ValidarPaquete } from "../application/casos-uso/validar-paquete"
import type { BitacoraHerramientas, Reloj } from "../application/puertos"
import { crearMotorControles } from "../domain/controles/motor-controles"
import { FsMaestrosRepository } from "../infrastructure/fixtures/fs-maestros-repository"
import { FsPaqueteRepository } from "../infrastructure/fixtures/fs-paquete-repository"
import { FsArtefactosCaso } from "../infrastructure/salida/fs-artefactos-caso"
import { CsvRegistroControl } from "../infrastructure/salida/csv-registro-control"
import { JsonlBitacoraHerramientas } from "../infrastructure/salida/jsonl-bitacora"
import { MockSapAdapter } from "../sap/mock"

export type ModuloOc = {
  readonly consultarPaquetes: ConsultarPaquetes
  readonly validarPaquete: ValidarPaquete
  readonly construirPayload: ConstruirPayload
  readonly generarEvidencia: GenerarEvidencia
  readonly crearOrden: CrearOrden
  readonly bitacora: BitacoraHerramientas
}

export type RutasModulo = {
  readonly raizProyecto: string
  readonly raizFixtures: string
  readonly raizSalida: string
}

export const relojSistema: Reloj = { ahora: () => new Date() }

export const crearModuloOc = (rutas: RutasModulo, reloj: Reloj = relojSistema): ModuloOc => {
  const paquetes = new FsPaqueteRepository(join(rutas.raizFixtures, "solicitudes"))
  const maestros = new FsMaestrosRepository(join(rutas.raizFixtures, "maestros"))
  const motor = crearMotorControles()
  const artefactos = new FsArtefactosCaso(rutas.raizSalida, rutas.raizProyecto)
  const sap = new MockSapAdapter(join(rutas.raizSalida, "sap"), maestros, reloj)
  const control = new CsvRegistroControl(join(rutas.raizSalida, "control.csv"))
  return {
    consultarPaquetes: new ConsultarPaquetes(paquetes),
    validarPaquete: new ValidarPaquete(paquetes, maestros, motor),
    construirPayload: new ConstruirPayload(paquetes, maestros, motor, artefactos),
    generarEvidencia: new GenerarEvidencia(paquetes, artefactos),
    crearOrden: new CrearOrden(paquetes, maestros, motor, sap, control, reloj),
    bitacora: new JsonlBitacoraHerramientas(join(rutas.raizSalida, "log.jsonl"), reloj),
  }
}

const modulosPorDirectorio = new Map<string, ModuloOc>()

export const moduloOcPara = (directorio: string): ModuloOc => {
  const existente = modulosPorDirectorio.get(directorio)
  if (existente) return existente
  const modulo = crearModuloOc({
    raizProyecto: directorio,
    raizFixtures: join(directorio, "fixtures", "reto-03"),
    raizSalida: join(directorio, "out"),
  })
  modulosPorDirectorio.set(directorio, modulo)
  return modulo
}
