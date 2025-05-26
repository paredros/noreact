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

## Cómo usarlo en Django
Una de las ideas centrales de este framework es no romper con la forma tradicional de trabajar en Django.
No necesitás transformar tus views en APIs, ni cambiar cómo escribís tus templates.
Seguís usando render(), extends, include, y toda la lógica que ya conocés.Una de las ideas centrales de este framework es no romper con la forma tradicional de trabajar en Django.
No necesitás transformar tus views en APIs, ni cambiar cómo escribís tus templates.
Seguís usando render(), extends, include, y toda la lógica que ya conocés.

###Views AJAX-friendly
Solo necesitás adaptar tus views para que puedan devolver:
El HTML completo (base.html + contenido) si es una carga directaO solo el bloque interno si es una navegación AJAX

Ejemplo:
```python
def about(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, 'about.html')  # solo la parte interna

    return render(request, 'base.html', {
        'template': 'about.html'  # HTML completo con base
    })
```
Esto permite que cuando navegás por AJAX, solo se devuelva el contenido parcial (about.html) que el framework va a insertar dentro de #main-content.

### Organización de templates
A diferencia de otros enfoques, no necesitás meter lógica de layout dentro de cada archivo.
El layout global (base.html) solo debe tener:
```html
<body>
    <header>...</header>

    {% include template %}
    
    <footer>...</footer>
    <script type="module" src="{% static 'js/noreact/main.js' %}"></script>
</body>
```
Y luego, en cada template interno (about.html, artist_detail.html, etc.), usás libremente HTML como siempre, incluyendo el contenedor que será reemplazado:
```html
<div id="main-content">
  <h1>Sobre nosotros</h1>
  <p>Este sitio está construido sin frameworks pesados.</p>
</div>
```
Esta decisión mantiene los templates modulares, simples y reutilizables.
No hay que romper ni reestructurar nada para trabajar con el sistema de transiciones.


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

### 1. Navegación AJAX normal (links o cualquier elemento)

Cualquier elemento con `data-ajax-link` dispara navegación AJAX reemplazando `#main-content`.

#### Ejemplo con `<a>` (convencional):

```html
<a href="/about/" data-ajax-link>About</a>
```

#### Ejemplo con <div> o <button> (usando data-target):
```html
<div data-ajax-link data-target="/about/" style="cursor: pointer;">
  Ir a About
</div>
```
Si el elemento es un <a>, se usa el atributo href.
Para otros elementos, se debe especificar data-target.

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

### 🔁 Disparar transición desde un botón o texto (usando imagen externa)

Podés disparar la transición de imagen desde cualquier elemento (botón, texto, link)  
usando `data-image-selector` para indicar qué imagen existente en la vista usar como origen.

#### Ejemplo:

```html
<!-- Imagen en la vista -->
<img id="obra-img" src="/media/obra.jpg" />

<!-- Botón que dispara la transición -->
<div class="to-image-transition" 
     data-target="/obra/23" 
     data-image-selector="#obra-img">
  <button>Ver detalles</button>
</div>
```

La imagen no necesita estar dentro del contenedor clickeado.
El atributo data-image-selector debe contener un selector CSS válido (#id, .clase, etc.).
Si no se especifica, se usa la imagen dentro del contenedor (comportamiento por defecto).

### 🎞️ Disparar transición de video desde un botón o texto (usando video externo)

Podés disparar la transición desde cualquier elemento, como un botón o un link,  
usando `data-video-selector` para indicar qué `<video>` usar como origen de la animación.

#### Ejemplo:

```html
<!-- Video en la vista -->
<video id="preview-video" autoplay muted loop src="/media/demo.mp4"></video>

<!-- Texto que dispara la transición -->
<div class="to-video-transition" 
     data-target="/artista/julia" 
     data-video-selector="#preview-video">
  <span>Ver artista</span>
</div>
```

Si no usás data-video-selector, se toma el <video> dentro del contenedor como hasta ahora.
El selector debe apuntar a un <video> existente en la vista actual.

En la página destino, asegurate de tener:En la página destino, asegurate de tener:
```html
<video data-main-video autoplay muted loop src="/media/demo.mp4"></video>
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

## ✨ Transiciones IN / OUT personalizadas

El framework permite definir transiciones visuales personalizadas entre páginas usando clases CSS aplicadas automáticamente al contenedor principal `#main-content`.

### 🔁 Cómo funciona

- Antes de reemplazar el contenido, se aplica `.noreact-out-transition`.
- Luego de insertar la nueva vista, se aplica `.noreact-in-transition`.
- Ambas clases se remueven automáticamente luego de que finaliza la transición.

Estas transiciones no están acopladas a una propiedad específica como `opacity`, sino que el framework espera el tiempo que definas con una variable CSS.

---

### 🎛 Definir duración de transición

Podés especificar la duración desde CSS usando variables personalizadas:

```css
#main-content {
  --noreact-out-duration: 0.7s;
  --noreact-in-duration: 0.5s;
}
```

El framework usará esos tiempos para saber cuándo continuar.

---

### 🧬 Ejemplo: transiciones suaves combinadas

```css
.noreact-out-transition {
  opacity: 0;
  transform: translateX(-50%);
  background-color: var(--secondColor);
  transition:
    opacity 0.7s ease,
    transform 0.3s ease,
    background-color 0.5s ease;
}

.noreact-in-transition {
  opacity: 1;
  transform: translateX(0);
  background-color: transparent;
  transition:
    opacity 0.5s ease,
    transform 0.3s ease,
    background-color 0.5s ease;
}
```

---

### 🎯 `transform-origin` adaptado al scroll

Para animaciones que usan `scale` o `transform`, el framework ajusta automáticamente el `transform-origin` en el eje vertical, alineándolo con el centro del viewport visible en el momento de la transición.  
Esto permite que el efecto se sienta natural incluso si la página es muy larga.

---

### ✅ Ventajas

- Declarativo y visual, completamente desde CSS
- Compatible con `transition` y `@keyframes`
- No depende de eventos como `transitionend`
- Permite animaciones más expresivas sin complicar el código JavaScript

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
