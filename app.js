// ============================================
// CERRAR SESIÓN CON EL BACKEND DE A.M.A.R.
// ============================================

$("#logout").onclick = async () => {
  try {
    await window.AMARApi.logout();

    message("#loginMessage", "Sesión cerrada correctamente.", true);
    show("loginView");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);

    message(
      "#loginMessage",
      error.message || "No se pudo cerrar la sesión."
    );
  }
};


// ============================================
// MODAL PARA VINCULAR ESP32 POR BLUETOOTH
// ============================================

$("#addDevice").onclick = () => openModal(`
  <h2>Vincular ESP32</h2>
  <p>Encendé tu dispositivo A.M.A.R. y asegurate de tenerlo cerca.</p>

  <form id="deviceForm">
    <div class="field">
      <label>Nombre del dispositivo en tu cuenta</label>
      <input id="deviceName" value="ESP32 A.M.A.R." required>
    </div>

    <button class="primary">Conectar por Bluetooth</button>

    <button
      type="button"
      class="secondary"
      onclick="closeModal()"
    >
      Cancelar
    </button>
  </form>
`);


// ============================================
// MODAL PARA AGREGAR CONTACTO DE EMERGENCIA
// ============================================

$("#addContact").onclick = () => openModal(`
  <h2>Nuevo contacto</h2>

  <form id="contactForm">
    <div class="field">
      <label>Nombre</label>
      <input id="contactName" required>
    </div>

    <div class="field">
      <label>Teléfono</label>
      <input
        id="contactPhone"
        type="tel"
        autocomplete="tel"
        required
      >
    </div>

    <div class="field">
      <label>Correo electrónico</label>
      <input
        id="contactEmail"
        type="email"
        autocomplete="email"
        required
      >
    </div>

    <div class="field">
      <label>Relación</label>
      <input id="contactRelation" placeholder="Ej. Madre">
    </div>

    <button class="primary">Guardar contacto</button>

    <button
      type="button"
      class="secondary"
      onclick="closeModal()"
    >
      Cancelar
    </button>
  </form>
`);


// ============================================
// PROCESAR FORMULARIOS
// MEDIANTE LA API DE RENDER
// ============================================

document.addEventListener("submit", async (event) => {
  if (
    event.target.id !== "deviceForm" &&
    event.target.id !== "contactForm"
  ) {
    return;
  }

  event.preventDefault();

  const form = event.target;

  const submitButton = form.querySelector(
    'button[type="submit"], button:not([type])'
  );

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {

    // ----------------------------------------
    // CONECTAR Y REGISTRAR EL ESP32
    // ----------------------------------------

    if (form.id === "deviceForm") {
      const name = $("#deviceName").value.trim();

      if (!name) {
        throw new Error("Ingresá un nombre para el dispositivo.");
      }

      // Conectar físicamente mediante Web Bluetooth.
      const connectedName = await window.connectAMARBluetooth(name);

      // Consultar los dispositivos que ya pertenecen al usuario.
      const devicesResult = await window.AMARApi.request(
        "/api/devices"
      );

      const devices = devicesResult.devices || [];

      // Evitar crear otro registro si el dispositivo ya existe.
      const existingDevice = devices.find(
        device =>
          device.name.trim().toLowerCase() === name.toLowerCase()
      );

      if (existingDevice) {
        // Actualizar el dispositivo existente.
        await window.AMARApi.request(
          `/api/devices/${encodeURIComponent(existingDevice.id)}`,
          {
            method: "PATCH",
            body: {
              status: "online",
              last_seen_at: new Date().toISOString()
            }
          }
        );
      } else {
        // Registrar el nuevo dispositivo en PostgreSQL.
        await window.AMARApi.request("/api/devices", {
          method: "POST",
          body: {
            name
          }
        });
      }

      // Evitar interpretar el nombre como HTML.
      const safeName = name.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);

      const safeConnectedName = String(
        connectedName || "A.M.A.R"
      ).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);

      openModal(`
        <h2>ESP32 conectado</h2>

        <p>
          <strong>${safeName}</strong>
          está conectado por Bluetooth.
        </p>

        <p>Dispositivo detectado: ${safeConnectedName}</p>

        <p>
          El dispositivo quedó registrado en tu cuenta.
          Todavía hay que adaptar el módulo Bluetooth para
          enviar las mediciones al backend de Render.
        </p>

        <button
          class="primary"
          onclick="closeModal(); loadDashboard()"
        >
          Entendido
        </button>
      `);
    }


    // ----------------------------------------
    // GUARDAR CONTACTO DE EMERGENCIA
    // ----------------------------------------

    if (form.id === "contactForm") {
      const name = $("#contactName").value.trim();
      const phone = $("#contactPhone").value.trim();
      const email = $("#contactEmail").value.trim();
      const relationship = $("#contactRelation").value.trim();

      if (!name || !phone || !email) {
        throw new Error(
          "Completá el nombre, el teléfono y el correo del contacto."
        );
      }

      // No enviamos user_id: el backend identifica
      // al usuario a partir del token de autenticación.
      await window.AMARApi.request("/api/contacts", {
        method: "POST",
        body: {
          name,
          phone,
          email,
          relationship
        }
      });

      closeModal();

      // Actualizar el panel con los datos guardados.
      await loadDashboard();
    }

  } catch (error) {
    console.error("Error al procesar el formulario:", error);

    alert(
      error.message || "No se pudo guardar la información."
    );
  } finally {
    if (submitButton && submitButton.isConnected) {
      submitButton.disabled = false;
    }
  }
});


// ============================================
// RESTAURAR LA SESIÓN AL ABRIR LA PÁGINA
// ============================================

(async () => {
  // Si no hay token, solicitar el inicio de sesión.
  if (!window.AMARApi.getToken()) {
    show("loginView");
    return;
  }

  try {
    // Validar la sesión contra nuestro backend.
    const result = await window.AMARApi.getMe();

    if (!result || !result.user) {
      await window.AMARApi.logout();
      show("loginView");
      return;
    }

    // Cargar el panel del usuario autenticado.
    await loadDashboard(result.user);

  } catch (error) {
    console.error(
      "Error al recuperar la sesión del backend:",
      error
    );

    message(
      "#loginMessage",
      "No se pudo comprobar la sesión: " +
        (error.message || "Error de conexión.")
    );

    show("loginView");
  }
})();
