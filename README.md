# noreact

# Mini Framework AJAX para Django + Transiciones

Este proyecto es un mini-framework en JavaScript diseñado para integrarse con proyectos Django, permitiendo una navegación fluida entre vistas, con transiciones animadas, carga de scripts dinámicos, y manejo modular del estado sin usar frameworks pesados como React o Vue.

---

## Filosofía

En muchos proyectos web modernos se cae rápidamente en la tentación de adoptar soluciones complejas para resolver problemas simples. Pero la complejidad no es gratis: consume tiempo, energía, recursos, y muchas veces termina alejando al desarrollador del control real sobre su código.

Este framework nace como una respuesta minimalista a esa tendencia. En lugar de imponer estructuras pesadas o herramientas externas, se apoya en la idea de que con JavaScript plano, un par de convenciones claras, y un diseño cuidadoso, se puede lograr una experiencia fluida, animada y mantenible, sin sacrificar simplicidad ni legibilidad.

- **Sin dependencias**: todo en JavaScript plano
- **Transiciones suaves entre vistas**, sin recargar todo el sitio.
- **Modularidad absoluta**: cada vista puede tener su propio JS embebido.
- **Limpieza automática** de animaciones, listeners y recursos.
- **Control total del DOM**, sin acoplamientos innecesarios.

---

## Objetivo

Este mini-framework implementa una navegación tipo SPA (Single Page Application), en la que los enlaces internos no recargan toda la página, sino que reemplazan dinámicamente el contenido principal (#main-content) mediante AJAX. Esto permite que la estructura general del sitio se mantenga, mientras el contenido, las animaciones y los scripts de cada vista se cargan y limpian modularmente.

A diferencia de los frameworks SPA tradicionales (React, Vue, etc.), este sistema no requiere compilar nada, ni mantener un estado global, ni renunciar al backend tradicional (como Django). Todo ocurre en el navegador, con archivos estáticos y control explícito: se navega sin reload, se transiciona sin glitch, y se ejecuta solo el código necesario en cada sección.

---

## Cómo funciona

El framework intercepta los clics en links y contenedores especiales, y realiza navegación AJAX reemplazando `#main-content` con el contenido nuevo. Esto permite aplicar transiciones visuales y cargar dinámicamente scripts embebidos de cada vista.

---

## Estructura

| Archivo               | Rol                                                  |
|----------------------|-------------------------------------------------------|
| `main.js`            | Punto de entrada. Inicializa el router y dispara `afterPageLoad`. |
| `router.js`          | Maneja la navegación AJAX y las delegaciones.         |
| `loader.js`          | Muestra un loader de progreso y ejecuta los scripts dinámicos. |
| `events.js`          | Sistema mínimo de eventos (`on`, `trigger`).          |
| `transition.js`      | Transiciones de opacidad por defecto.                 |
| `video-transition.js`| Transición especial: expande un `<video>` a fullscreen. |
| `image-transition.js`| Transición especial: expande una `<img>` a fullscreen. |
| `styles.css`         | Estilos básicos del loader y transiciones.            |

---

## Cómo usarlo

### 1. Navegación AJAX normal

Para que un link se cargue con AJAX y sin recarga de página:

```html
<a href="/about/" data-ajax-link>About</a>
```

---

### 2. Transiciones especiales (video / imagen)

Podés envolver un video o imagen en un contenedor con clase especial:

```html
<div class="to-video-transition" data-target="/artista/julia">
  <video autoplay muted loop src="..."></video>
</div>

<div class="to-image-transition" data-target="/obra/23">
  <img src="..." />
</div>
```

Al hacer click, el contenido se expande a fullscreen y luego transiciona a la nueva página.

!!!! Importante: en la página de destino, el video o imagen que recibe la transición debe tener uno de los siguientes atributos:

- `<video data-main-video>` → si se trata de una transición de video.
- `<img data-main-image>` → si es una transición de imagen.

Esto le indica al framework cuál es el elemento final donde debe aterrizar la animación del clon fullscreen.

Ejemplo:

```html
<!-- En la página artista.html -->
<video data-main-video autoplay muted loop src="video_completo.mp4"></video>

<!-- O en una página de la obra -->
<img data-main-image src="obra_completa.jpg" />
```


---

## Scripts por vista

Cada vista puede incluir su propio script JS embebido. El framework los ejecuta automáticamente al cargar la vista.

### `<script type="text/anim-js">`

Para código común (no módulo)

```html
<script type="text/anim-js">
  console.log("Animación básica ejecutada");
</script>
```

### `<script type="module-js">`

Para usar módulos ES6 (`import`, etc.). El framework los inyecta como `<script type="module">`.

```html
<script type="module-js">
  import { gsap } from "gsap";

  const el = document.querySelector('.animado');
  gsap.to(el, { opacity: 1, duration: 1 });
</script>
```

---

## Limpieza automática (cleanup)

La limpieza de memoria, de scripts, y cualquier basura que pueda quedar corriendo de fondo
es exclusiva responsabilidad del mismo script y de la organizacion del desarrollador.
Para eso cada vista puede definir dentro del module-js por ejemplo:

```js
window.cleanupPage = () => {
  // remover listeners, detener animaciones, etc.
};
```

El framework ejecuta `cleanupPage()` antes de reemplazar el contenido con `loadPage()`.

---

## Sincronización de video (opcional)

Si usás una transición de video, el framework guarda el tiempo actual en:

```js
window.__transitionVideoSyncTime
```

Tu script de la vista puede leerlo y sincronizar el video manualmente:

```js
const video = document.querySelector('video[data-main-video]');
if (typeof window.__transitionVideoSyncTime !== 'undefined') {
  video.currentTime = window.__transitionVideoSyncTime;
  delete window.__transitionVideoSyncTime;
}
```

---

## Consideraciones importantes

- El contenedor principal debe tener ID `#main-content`.
- Las transiciones por defecto son de opacidad. Podés reemplazarlas en `transition.js`.
- Los eventos `beforePageLoad` y `afterPageLoad` están disponibles para enganchar lógica global.
- Las imágenes y videos de transición deben tener `data-main-image` o `data-main-video` para enlazar con el clon.

---

## Compatibilidad

Testeado en:
- Chrome
- Safari (desktop y mobile)
- iOS con historial, video, y carga AJAX

---

## Casos de uso

[Black Oveja Collective](https://www.blackovejacollective.com/)

---

## 📜 Licencia

GNU 3 GPL
