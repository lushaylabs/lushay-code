# Verificación de Lushay Code Fork Actions v2

Fecha: 1 de noviembre de 2026 (America/Lima).
Versión del fork: 0.1.0. Origen: Lushay Labs Lushay Code, base VHDL v1.

## Resultado local

- Instalación limpia con `npm ci --no-audit --no-fund`: aprobada.
- Compilación TypeScript y pruebas unitarias: 8 aprobadas, 0 fallidas.
  Se omitió 1 bloque de integración que requiere OSS CAD Suite.
- ESLint: 0 errores y 100 advertencias de estilo.
- Workflow validado con actionlint 1.7.7: aprobado; se desactivaron solamente
  los analizadores externos ShellCheck y Pyflakes, que no estaban instalados.
- SerialPort nativo cargado correctamente en Linux x64.
- VSIX Linux x64 generado con vsce 4.1.0 y verificado estructuralmente:
  código compilado, esquema, dependencias y binario nativo Linux presentes.
- VSIX Windows x64 empaquetado desde Linux y verificado estructuralmente:
  target win32-x64 y binario nativo Windows presentes. Esto no ejecuta ese binario.
- Script de identidad probado en una copia aislada: propietario del fork correcto,
  etiqueta coincidente aceptada, etiqueta incorrecta rechazada antes de modificar
  el manifiesto.
- Manifiesto y lockfile coherentes. El fuente usa publisher neutral fpga-custom;
  Actions lo sustituye por el propietario del fork durante el empaquetado.

## Evidencia reutilizada

La versión VHDL v1 pasó 13 pruebas sin omisiones, incluida generación de bitstream
Gowin desde VHDL y regresión Verilog. Se conserva su registro como baseline-v1.
Ese registro no constituye una nueva certificación de síntesis de esta versión v2.
En v2 se añadieron el empaquetado CI, la ruta externa de herramientas, la
conservación del entorno y un override para gowin_pack.

## Alcance pendiente

El workflow todavía no se ha ejecutado en el fork del usuario. El primer run en
GitHub verificará el runner Windows, las descargas de artifacts y la publicación
de assets en Releases. La GUI de VS Code, una instalación concreta de MSYS2 y el
hardware del usuario requieren su prueba. Los perfiles de sus placas no están
incorporados. No se publicó el código en GitHub ni la extensión en Marketplace.

## Reproducibilidad

Node.js usado aquí: 24.22.1. vsce: 4.1.0, fijado en el lockfile.
Acciones oficiales resueltas y fijadas por commit:

- checkout v7: 3d3c42e5aac5ba805825da76410c181273ba90b1
- setup-node v7: 949feb2413d6458794dcd2491c4babbbce0c15c1
- upload-artifact v7.0.2: cf430e030ddbb5b0abf93d22962f4752f3646cd9

Los logs de empaquetado usan identidades de validación. Los instaladores de prueba
no están dentro de este ZIP: el paquete entrega los fuentes para generar los
instaladores con la identidad del fork en GitHub Actions.
