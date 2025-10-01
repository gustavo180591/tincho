<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  // Help categories and questions
  const helpSections = [
    {
      title: 'Compras',
      icon: '🛒',
      questions: [
        {
          question: '¿Cómo realizar un pedido?',
          answer: 'Para realizar un pedido, sigue estos pasos: 1) Busca el producto que deseas, 2) Selecciona la cantidad y variante, 3) Haz clic en "Agregar al carrito", 4) Ve a tu carrito y completa el proceso de pago.'
        },
        {
          question: '¿Qué métodos de pago aceptan?',
          answer: 'Aceptamos múltiples métodos de pago incluyendo tarjetas de crédito/débito, transferencias bancarias, y pagos con MercadoPago.'
        },
        {
          question: '¿Cómo sé si un producto está disponible?',
          answer: 'Los productos disponibles muestran el botón "Agregar al carrito". Si un producto está agotado, verás la etiqueta "Sin stock".'
        }
      ]
    },
    {
      title: 'Envíos',
      icon: '🚚',
      questions: [
        {
          question: '¿Cuánto tarda en llegar mi pedido?',
          answer: 'El tiempo de entrega varía según tu ubicación. Generalmente, los envíos nacionales toman entre 3-5 días hábiles.'
        },
        {
          question: '¿Hacen envíos a todo el país?',
          answer: 'Sí, realizamos envíos a todo el territorio nacional. Los costos y tiempos pueden variar según la ubicación.'
        },
        {
          question: '¿Cómo hiero seguimiento de mi pedido?',
          answer: 'Una vez despachado tu pedido, recibirás un correo con el número de seguimiento y un enlace para rastrear tu envío en tiempo real.'
        }
      ]
    },
    {
      title: 'Devoluciones',
      icon: '🔄',
      questions: [
        {
          question: '¿Cuál es la política de devoluciones?',
          answer: 'Aceptamos devoluciones dentro de los 30 días posteriores a la recepción del producto, siempre que esté en su estado original y con su empaque.'
        },
        {
          question: '¿Cómo inicio una devolución?',
          answer: 'Para iniciar una devolución, contáctanos a través del formulario de contacto o al correo soporte@tincho.com con tu número de pedido y motivo de la devolución.'
        },
        {
          question: '¿Cuánto tarda el reembolso?',
          answer: 'Una vez recibido el producto en nuestro centro de distribución, el reembolso se procesará en un plazo de 5-7 días hábiles.'
        }
      ]
    },
    {
      title: 'Cuenta',
      icon: '👤',
      questions: [
        {
          question: '¿Cómo creo una cuenta?',
          answer: 'Haz clic en "Registrarse" en la esquina superior derecha y completa el formulario con tus datos personales.'
        },
        {
          question: '¿Cómo cambio mi contraseña?',
          answer: 'Ve a "Mi cuenta" > "Seguridad" y selecciona "Cambiar contraseña". Sigue las instrucciones para actualizarla.'
        },
        {
          question: '¿Cómo actualizo mis datos personales?',
          answer: 'Puedes actualizar tu información personal en cualquier momento desde la sección "Mi perfil" en tu cuenta.'
        }
      ]
    },
    {
      title: 'Garantías',
      icon: '🔧',
      questions: [
        {
          question: '¿Los productos tienen garantía?',
          answer: 'Sí, todos nuestros productos tienen garantía de fábrica. La duración varía según el producto y el fabricante.'
        },
        {
          question: '¿Qué cubre la garantía?',
          answer: 'La garantía cubre defectos de fabricación. No cubre daños por mal uso, accidentes o desgaste normal del producto.'
        },
        {
          question: '¿Cómo hiero válida la garantía?',
          answer: 'Conserva tu comprobante de compra y contáctanos a través de nuestro formulario de garantías para iniciar el proceso.'
        }
      ]
    },
    {
      title: 'Facturación',
      icon: '🧾',
      questions: [
        {
          question: '¿Cómo obtengo mi factura?',
          answer: 'Al completar tu compra, recibirás la factura electrónica en el correo registrado. También puedes descargarla desde "Mis pedidos" en tu cuenta.'
        },
        {
          question: '¿Puedo pedir factura A?',
          answer: 'Sí, puedes seleccionar "Factura A" durante el proceso de pago y completar los datos fiscales correspondientes.'
        },
        {
          question: '¿Qué hago si mi factura tiene un error?',
          answer: 'Contáctanos a facturacion@tincho.com con el número de pedido y los detalles del error para ayudarte a corregirlo.'
        }
      ]
    }
  ];
  
  // State for expanded questions
  let expanded = {};
  
  // Toggle question expansion
  function toggleQuestion(sectionIndex: number, questionIndex: number) {
    const key = `${sectionIndex}-${questionIndex}`;
    expanded = { ...expanded, [key]: !expanded[key] };
  }
</script>

<svelte:head>
  <title>Centro de Ayuda | Tincho</title>
  <meta name="description" content="Encuentra respuestas a las preguntas más frecuentes sobre compras, envíos, devoluciones y más." />
</svelte:head>

<main class="min-h-screen bg-gray-50 py-12">
  <div class="container mx-auto px-4">
    <!-- Hero Section -->
    <div class="text-center mb-16">
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">¿Cómo podemos ayudarte?</h1>
      <p class="text-lg text-gray-600 max-w-3xl mx-auto">
        Encuentra respuestas a las preguntas más frecuentes o contáctanos directamente si necesitas ayuda adicional.
      </p>
      
      <!-- Search Bar -->
      <div class="max-w-2xl mx-auto mt-8">
        <div class="relative">
          <input 
            type="text" 
            placeholder="Buscar en el centro de ayuda..." 
            class="w-full px-6 py-4 pr-12 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Help Categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
      {#each helpSections as section, sectionIndex}
        <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
          <div class="text-4xl mb-4">{section.icon}</div>
          <h2 class="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
          <ul class="space-y-3">
            {#each section.questions as question, questionIndex}
              <li>
                <a 
                  href="#" 
                  on:click|preventDefault={() => toggleQuestion(sectionIndex, questionIndex)}
                  class="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center"
                >
                  <span>{question.question}</span>
                  <svg 
                    class={`w-4 h-4 ml-1 transition-transform ${expanded[`${sectionIndex}-${questionIndex}`] ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
                {#if expanded[`${sectionIndex}-${questionIndex}`]}
                  <div class="mt-2 text-sm text-gray-600 pl-2 border-l-2 border-blue-200">
                    {question.answer}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
    
    <!-- Contact Section -->
    <div class="bg-white rounded-xl shadow-sm p-8 max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">¿No encontraste lo que buscabas?</h2>
        <p class="text-gray-600">Nuestro equipo de soporte está aquí para ayudarte</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="font-medium text-gray-900 mb-1">Correo electrónico</h3>
          <p class="text-sm text-gray-600">soporte@tincho.com</p>
          <p class="text-xs text-gray-500 mt-1">Respuesta en 24 horas</p>
        </div>
        
        <div class="text-center">
          <div class="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h3 class="font-medium text-gray-900 mb-1">Teléfono</h3>
          <p class="text-sm text-gray-600">(011) 1234-5678</p>
          <p class="text-xs text-gray-500 mt-1">Lun a Vie de 9 a 18 hs</p>
        </div>
        
        <div class="text-center">
          <div class="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 class="font-medium text-gray-900 mb-1">Chat en vivo</h3>
          <p class="text-sm text-gray-600">Iniciar chat</p>
          <p class="text-xs text-gray-500 mt-1">Disponible ahora</p>
        </div>
      </div>
      
      <div class="mt-12 border-t border-gray-200 pt-8">
        <h3 class="text-lg font-medium text-gray-900 mb-4">O envíanos un mensaje</h3>
        <form class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input type="text" id="name" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input type="email" id="email" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            </div>
          </div>
          <div>
            <label for="subject" class="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
            <input type="text" id="subject" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
          </div>
          <div>
            <label for="message" class="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
            <textarea id="message" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>
          <div class="pt-2">
            <button type="submit" class="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Enviar mensaje
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</main>

<style>
  /* Custom styles */
  .faq-item {
    transition: all 0.3s ease;
  }
  
  .faq-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }
  
  .faq-item.active .faq-content {
    max-height: 500px; /* Adjust based on your content */
  }
</style>
