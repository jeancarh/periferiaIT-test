type Props = {
  readonly sugerencias: readonly string[]
  readonly onElegir: (texto: string) => void
}

export const Suggestions = ({ sugerencias, onElegir }: Props) => (
  <section className="sugerencias" aria-label="Sugerencias">
    <h2 className="sugerencias__titulo">Prueba con una de estas solicitudes</h2>
    <ul className="sugerencias__lista">
      {sugerencias.map((sugerencia) => (
        <li key={sugerencia}>
          <button type="button" className="sugerencia" onClick={() => onElegir(sugerencia)}>
            {sugerencia}
          </button>
        </li>
      ))}
    </ul>
  </section>
)
