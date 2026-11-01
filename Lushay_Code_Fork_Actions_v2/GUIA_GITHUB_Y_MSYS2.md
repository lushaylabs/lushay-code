# Lushay Code VHDL: subir al fork, generar VSIX y usar MSYS2

Esta entrega contiene el código VHDL anterior más un workflow listo para construir
la extensión en GitHub Actions. El código del repositorio se copia directamente a
tu fork. Node.js, npm, TypeScript y el empaquetador se ejecutan en GitHub; para
instalar el resultado en VS Code basta el archivo VSIX correspondiente a tu entorno.

## 1. Subir los archivos desde GitHub, sin instalar npm en tu PC

1. Abre tu fork. Crea la rama `kallpax` si quieres conservar `main` como base original.
2. Descomprime el ZIP y entra en la carpeta `Lushay_Code_Fork_Actions_v2`.
3. En GitHub, usa **Add file → Upload files**. Sube el CONTENIDO de esa carpeta a
   la raíz del repositorio y confirma el commit en la rama elegida.
4. Verifica que `package.json`, `package-lock.json`, `src`, `scripts` y `tests`
   quedaron directamente en la raíz, sin otra carpeta envolvente.
5. Verifica también `.github/workflows/build-vsix.yml`. Si tu selector ocultó esa
   carpeta, usa **Add file → Create new file**, escribe ese nombre completo y
   pega el contenido del archivo incluido en la entrega.
6. Abre **Actions**. Si GitHub pide habilitar los workflows del fork, habilítalos.
   Un push a una rama con este workflow genera los instaladores automáticamente.
7. Si habilitaste Actions después del commit, realiza un nuevo commit para iniciar
   la ejecución. El botón **Run workflow** está disponible cuando el workflow
   existe también en la rama predeterminada del fork.

Los archivos del ZIP son el código completo, no solamente un workflow: deben
actualizarse también las fuentes VHDL, los scripts y el lockfile.

## 2. Descargar e instalar la extensión

En **Actions → Build VSIX**, abre la ejecución terminada. En **Artifacts** aparecen:

| Artifact | Entorno donde se ejecuta la extensión |
|---|---|
| `vsix-win32-x64` | VS Code nativo en Windows x64 |
| `vsix-linux-x64` | VS Code en Linux x64 o extensión ejecutándose dentro de WSL x64 |

Descarga el artifact y extrae el VSIX del ZIP. En VS Code abre **Extensions → … →
Install from VSIX…**, selecciona el archivo e instala. Desactiva la extensión
original de Lushay mientras pruebas el fork: ambas usan los mismos comandos y
el mismo editor de restricciones. Esta entrega no cambia sus identificadores
internos para facilitar la compatibilidad con los proyectos existentes.

La identidad del paquete generado usa el propietario de TU fork como `publisher`,
el nombre `lushay-code-vhdl` y el nombre visible `Lushay Code VHDL (Fork)`.
Esto es metadata del VSIX; no registra automáticamente un publisher en Marketplace.
Los ejemplos `example-owner` que puedan aparecer en registros locales son pruebas
de empaquetado. GitHub Actions los sustituye por la identidad de tu repositorio.

## 3. Qué hace Actions

- Instala Node.js 24 y las dependencias exactas del lockfile usando `npm ci`.
- Ejecuta ESLint, compila TypeScript y corre las pruebas unitarias.
- Comprueba la carga del módulo nativo SerialPort en cada runner.
- Usa `@vscode/vsce` 4.1.0, fijado en las dependencias de desarrollo y en el lockfile.
- Empaqueta por separado Windows x64 y Linux x64, con las dependencias de ejecución.
- Inspecciona el VSIX para verificar los JS compilados, el esquema y los binarios
  nativos necesarios; genera un SHA-256 y sube ambos archivos.
- Conserva los artifacts de pruebas durante 30 días.

No hace falta configurar tokens personales ni una cuenta de Marketplace para
construir los VSIX. El job de release usa el token automático del repositorio.
El workflow utiliza acciones oficiales fijadas por SHA de commit.

Las pruebas con herramientas FPGA reales se omiten cuando no está definida
`LUSHAY_OSS_CAD_SUITE`. Por eso un build verde del VSIX certifica la compilación,
las pruebas unitarias y el empaquetado, no la ejecución de hardware ni una síntesis
Gowin completa en Windows.

## 4. Crear una versión estable en Releases

La versión de esta entrega es `0.1.0`.

1. Después de que Actions termine correctamente, abre **Releases → Draft a new release**.
2. Elige la rama donde subiste este código y crea la etiqueta **`v0.1.0`**.
3. Escribe las notas de esa versión y publícala.
4. El workflow construye los paquetes para esa etiqueta y los adjunta a la release.

También funciona un push de la etiqueta desde Git: si la release no existe, el
workflow la crea. Los disparos duplicados para la misma referencia se cancelan.
Una etiqueta diferente de `v` + la versión de `package.json` falla con un mensaje
explícito. Para versiones posteriores actualiza `version` en `package.json` y los
campos de versión del proyecto raíz en `package-lock.json` antes de crear la etiqueta.
Los assets existentes no se sobrescriben; utiliza una versión nueva para un código
diferente. El workflow no publica en VS Code Marketplace.

## 5. ¿Debo compilar el plugin dentro de Yosys?

La extensión necesita el comando de síntesis VHDL `ghdl` dentro de Yosys.
Puede estar integrado en ese ejecutable o estar disponible como módulo externo.
Instalar `ghdl.exe` y `yosys.exe` por separado no demuestra, por sí solo, que el
frontend esté disponible. Una extensión de edición o simulación como TerosHDL
tampoco determina cómo se construyó tu Yosys.

En una terminal de tu entorno MSYS2, ejecuta:

```sh
yosys -p "help ghdl"
```

Si muestra ayuda específica del comando `ghdl`, usa el frontend integrado:

```json
"ghdlPlugin": ""
```

Si indica que el comando no existe, prueba:

```sh
yosys -m ghdl -p "help ghdl"
```

Si ahora muestra la ayuda, usa el módulo externo:

```json
"ghdlPlugin": "ghdl"
```

También puedes indicar una ruta explícita al módulo compatible en `ghdlPlugin`.
La ruta relativa se interpreta desde el archivo `.lushay.json`.
Lee la salida: algunas versiones de `help` pueden devolver código 0 aun cuando
el comando consultado no exista. Si fallan ambas opciones, necesitas una
distribución compatible que proporcione ese frontend o construirlo contra las
versiones exactas de Yosys y GHDL que usarás.

La recomendación para esta entrega es reutilizar tu instalación compatible.
El VSIX no incorpora un Yosys ni un plugin binario universal. El módulo externo
debe corresponder al sistema operativo, arquitectura y compilación de Yosys/GHDL.
Una instalación MSYS2 de una familia de entorno no debe completarse con DLL
arbitrarias de otra familia o con archivos de OSS CAD Suite sin validación.

## 6. Configurar MSYS2 en esta extensión

En **Preferences: Open User Settings (JSON)** de VS Code, adapta esta ruta a tu PC:

```json
{
  "lushay.Toolchain.binPath": "C:/msys64/ucrt64/bin",
  "lushay.Build.toolchain": "open-source"
}
```

La ruta explícita tiene prioridad sobre `lushay.OssCadSuite.path`; no necesitas
instalar OSS CAD Suite para satisfacer ese ajuste. Si tu instalación funcional
anterior usa `mingw64`, selecciona su carpeta real `C:/msys64/mingw64/bin`.
Para instalaciones nuevas, MSYS2 recomienda UCRT64 en su documentación.

En el archivo del proyecto `.lushay.json`, elige `ghdlPlugin` según la comprobación
anterior y lista paquetes antes de las entidades que los usan:

```json
{
  "name": "mi-proyecto",
  "board": "tangnano9k",
  "top": "Blink_Top",
  "includedFiles": ["counter_pkg.vhd", "blink.vhdl"],
  "constraintsFile": "tangnano9k.cst",
  "programMode": "ram",
  "ghdlOptions": ["--std=08"],
  "ghdlPlugin": ""
}
```

Este ejemplo usa el perfil y el pinout de Tang Nano 9K. Para tus placas se requieren
el dispositivo, encapsulado, reloj, pines y programador reales; todavía no se
añadieron perfiles específicos de tus placas.

El flujo completo Gowin también necesita nextpnr con soporte para el dispositivo,
Apicula (`gowin_pack`) y openFPGALoader para programar. Yosys/GHDL cubren la
síntesis; los demás pasos necesitan sus propias herramientas compatibles.
Si están en otras ubicaciones, usa los ajustes `lushay.Build.overrideYosysPath`,
`overrideNextpnrPath`, `overrideGowinPackPath` y `overrideOpenFpgaLoaderPath`.
Los directorios y las variables que esas herramientas necesiten deben estar
disponibles al proceso de VS Code. La extensión conserva el entorno heredado,
incluidos `SystemRoot`, `TEMP` y cualquier `GHDL_PREFIX` que hayas configurado.

Encontrarás muestras completas de los ajustes y de ambos modos GHDL en
`config-examples/`. Para probar el blinky, abre `examples/vhdl-blinky` como carpeta,
ajusta allí `ghdlPlugin` y ejecuta **Run FPGA Toolchain → Build Only**.

## 7. Conservar una ruta de contribución al original

Usa `kallpax` para esta distribución integrada. Para aportar VHDL a Lushay Labs,
conserva una rama independiente a partir del original e incorpora solamente el
cambio VHDL revisable. Mantén la licencia y la atribución original. El workflow y
los cambios de identidad del fork pueden revisarse por separado.

## Fuentes oficiales consultadas

- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://github.com/microsoft/vscode-vsce
- https://github.com/ghdl/ghdl-yosys-plugin
- https://packages.msys2.org/packages/mingw-w64-ucrt-x86_64-yosys
- https://www.msys2.org/docs/environments/
- https://github.com/actions/checkout
- https://github.com/actions/setup-node
- https://github.com/actions/upload-artifact
