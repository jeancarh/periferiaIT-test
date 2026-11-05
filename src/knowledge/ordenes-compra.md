# Proceso de órdenes de compra

## Paquete de una solicitud

Cada compra llega por correo con tres piezas: la solicitud (Excel normalizado), la cotización del proveedor y el correo de aprobación del líder. En algunos casos llega también la factura, lo que indica que la OC se está creando después de recibir la factura.

## Controles

| Código | Control | Tipo |
|---|---|---|
| RC1 | El proveedor existe en el maestro (por NIT, o por nombre normalizado si no hay NIT) y está activo. | Bloqueo |
| RC2 | Hay aprobación, contiene "Aprobado" y viene de un aprobador del centro de costo. | Bloqueo |
| RC3 | El valor total no supera el tope del aprobador en ese centro de costo. | Bloqueo |
| RC4 | La subárea pertenece al centro de costo. | Bloqueo |
| RC5 | La cotización no difiere más de 2 % del valor de la solicitud; sin cotización se pide confirmación. | Confirmación |
| RC6 | Sin indicador de IVA se propone el del proveedor y se pide confirmación. | Confirmación y derivado |
| RC7 | Sin condiciones de pago se usan las del proveedor y solo se informa. | Derivado |
| RC8 | Una factura anterior a la solicitud marca la OC como retroactiva. | Confirmación |
| RC9 | La aprobación debe ser de la misma fecha o posterior a la solicitud. | Confirmación |
| RC10 | Cantidad × valor unitario debe igualar el valor total (± 1 unidad monetaria). | Bloqueo |

- **Bloqueo**: la OC no se crea. Se informa la razón y la acción sugerida.
- **Confirmación**: la OC se crea solo si la analista confirma explícitamente.
- **Derivado**: valor completado desde un maestro que siempre se informa con su fuente.

## Orden de compra en SAP

- Sociedad y organización de compras: `1000`.
- Monedas admitidas: COP y USD.
- Texto breve de la posición: máximo 40 caracteres.
- Unidades: `UN` (unidad), `H` (hora), `MES` (mes).
- La OC se crea con el valor de la solicitud aprobada, nunca con el de la cotización.
- El número de OC lo asigna SAP. Crear dos veces la misma solicitud devuelve el número existente.

## Evidencia y control

- La evidencia del correo de aprobación se guarda en `out/<caso>/aprobacion.txt` y `aprobacion.pdf` con su huella SHA-256, que viaja en la OC.
- Cada intento de creación (creada, idempotente, bloqueada o pendiente) queda en `out/control.csv`, que consume auditoría.
- Las OC retroactivas se crean solo con confirmación y quedan marcadas `retroactiva = true` para medir el desvío de proceso.
