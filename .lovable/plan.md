

# Editor de Manuscritos — Plan

## Resumen

Construir una página de editor completa en `src/pages/EditorPage.tsx` con estado local (sin backend por ahora, ya que no hay Supabase conectado). Los capítulos se guardarán en `localStorage` para persistencia básica. La corrección con IA se dejará como placeholder funcional (botón visible, modal que indica que se necesita conectar backend).

## Componentes a crear

1. **`src/pages/EditorPage.tsx`** — Página principal, reescrita completamente:
   - Sidebar izquierdo con lista de capítulos (crear, renombrar, eliminar, reordenar)
   - Area central: `<textarea>` grande para escribir/pegar texto
   - Barra superior: título del capítulo activo, contador de palabras en tiempo real, botón "Guardar", botón "Corregir con IA"
   - Estado gestionado con `useState` + `localStorage` para persistencia

2. **`src/hooks/useManuscript.ts`** — Hook custom para gestionar estado del manuscrito:
   - Interfaz `Chapter { id, title, content, updatedAt }`
   - CRUD de capítulos en localStorage
   - Capítulo activo, contador de palabras
   - Auto-guardado con debounce

3. **Corrección con IA** — Botón que abre un Dialog mostrando un mensaje indicando que se necesita conectar Lovable Cloud/Supabase para habilitar IA. Esto permite activar la funcionalidad real después sin cambios de UI.

## Flujo de usuario

1. Usuario llega al Editor → ve un capítulo por defecto "Capítulo 1"
2. Escribe o pega texto → contador de palabras se actualiza en tiempo real
3. Puede crear nuevos capítulos desde el sidebar → se guardan automáticamente en localStorage
4. Botón "Corregir con IA" → abre dialog placeholder
5. Todo persiste entre recargas vía localStorage

## Diseño visual

- Mantiene la paleta ink/gold existente
- Sidebar de capítulos con fondo `card`, bordes sutiles
- Textarea con estilo limpio, tipografía serif para el contenido (Playfair Display o Source Sans)
- Barra de estado inferior con contador de palabras y caracteres
- Layout con `ResizablePanelGroup` para sidebar + editor

## Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `src/hooks/useManuscript.ts` | Crear — hook de gestión de capítulos |
| `src/pages/EditorPage.tsx` | Reescribir — editor completo |

