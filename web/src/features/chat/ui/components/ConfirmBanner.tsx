type Props = {
  readonly deshabilitado: boolean
  readonly onConfirmar: () => void
  readonly onRechazar: () => void
}

export const ConfirmBanner = ({ deshabilitado, onConfirmar, onRechazar }: Props) => (
  <div className="confirmacion" role="alertdialog" aria-label="Confirmación requerida">
    <p className="confirmacion__texto">
      <strong>El agente espera tu confirmación.</strong> No se creará nada en SAP hasta que respondas.
    </p>
    <div className="confirmacion__acciones">
      <button type="button" className="boton boton--primario" disabled={deshabilitado} onClick={onConfirmar}>
        Confirmo, créala
      </button>
      <button type="button" className="boton" disabled={deshabilitado} onClick={onRechazar}>
        No crear
      </button>
    </div>
  </div>
)
