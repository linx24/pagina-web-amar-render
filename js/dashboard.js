// Carga del panel desde el backend propio de A.M.A.R.

function renderDashboardDevices(devices) {
  const list = $("#devicesList");

  if (!devices.length) {
    list.innerHTML =
      '<p class="empty">Todavía no registraste dispositivos.</p>';
    return;
  }

  list.innerHTML = devices.map(device => `
    <div class="record-item">
      <div class="record-info">
        <strong>${escapeHTML(device.name)}</strong>
        <small>Estado: ${escapeHTML(device.status || "Sin estado")}</small>
        <br>
        <small>Última conexión: ${
          device.last_seen_at
            ? escapeHTML(new Date(device.last_seen_at).toLocaleString())
            : "Sin conexión registrada"
        }</small>
      </div>
    </div>
  `).join("");
}

function renderDashboardContacts(contacts) {
  const list = $("#contactsList");

  if (!contacts.length) {
    list.innerHTML =
      '<p class="empty">Todavía no agregaste contactos.</p>';
    return;
  }

  list.innerHTML = contacts.map(contact => `
    <div class="record-item">
      <div class="record-info">
        <strong>${escapeHTML(contact.name)}</strong>
        <small>Teléfono: ${escapeHTML(contact.phone)}</small>
        <br>
        <small>Correo: ${escapeHTML(contact.email || "No especificado")}</small>
        <br>
        <small>Relación: ${escapeHTML(contact.relationship || "No especificada")}</small>
      </div>
      <div class="record-actions">
        <a class="call-button"
           href="tel:${encodeURIComponent(contact.phone)}"
           aria-label="Llamar a ${escapeHTML(contact.name)}">
          Llamar
        </a>
      </div>
    </div>
  `).join("");
}

async function loadDashboard(user = null) {
  try {
    // Recuperar el usuario desde el token propio de A.M.A.R.
    if (!user) {
      const result = await window.AMARApi.getMe();
      user = result.user;
    }

    if (!user) {
      show("loginView");
      return;
    }

    // Obtener el resumen, las listas y las primeras mediciones.
    const [
      dashboard,
      devicesResult,
      contactsResult,
      readingsResult
    ] = await Promise.all([
      window.AMARApi.request("/api/dashboard"),
      window.AMARApi.request("/api/devices"),
      window.AMARApi.request("/api/contacts"),
      window.AMARApi.request("/api/readings?limit=1000&offset=0")
    ]);

    // Recuperar el historial completo por páginas de hasta 1000 filas.
    const readings = [...(readingsResult.readings || [])];
    let offset = readings.length;

    while (readings.length === offset && offset > 0 &&
           readingsResult.readings.length === 1000 &&
           offset <= 1000000) {
      const page = await window.AMARApi.request(
        `/api/readings?limit=1000&offset=${offset}`
      );

      const rows = page.readings || [];
      readings.push(...rows);
      offset += rows.length;

      if (rows.length < 1000) break;
    }

    const devices = devicesResult.devices || [];
    const contacts = contactsResult.contacts || [];

    // Actualizar el resumen principal.
    $("#patientName").textContent =
      dashboard.profile?.name || user.name || user.email || "Paciente";

    const reading = dashboard.reading;

    $("#bpm").textContent = reading?.lpm ?? "--";

    $("#readingTime").textContent = reading?.recorded_at
      ? new Date(reading.recorded_at).toLocaleString()
      : "Sin datos";

    $("#contactsCount").textContent =
      dashboard.contactsCount ?? contacts.length;

    const device = dashboard.device;

    $("#deviceBadge").textContent = device
      ? `${device.name}: ${device.status}`
      : "Sin dispositivo";

    $("#heartState").textContent = reading
      ? "Última lectura recibida"
      : "Esperando lecturas del dispositivo";

    const location = dashboard.location;

    $("#location").textContent = location
      ? `${location.latitude}, ${location.longitude} — ${
          new Date(location.recorded_at).toLocaleString()
        }`
      : "Todavía no se recibió una ubicación.";

    const alertData = dashboard.alert;

    $("#alert").textContent = alertData
      ? `${alertData.type}: ${alertData.message || "Sin descripción"}`
      : "No hay alertas registradas.";

    // Mostrar las listas obtenidas de la API.
    renderDashboardDevices(devices);
    renderDashboardContacts(contacts);

    // Entregar las mediciones al módulo que dibuja el calendario.
    if (typeof heartReadings !== "undefined") {
      heartReadings = readings;

      if (typeof renderDailySummary === "function") {
        renderDailySummary();
      }

      if (typeof renderCalendar === "function") {
        renderCalendar();
      }
    }

    show("appView");
  } catch (error) {
    console.error("Error al cargar el panel:", error);

    message(
      "#loginMessage",
      "No se pudo cargar el panel: " +
        (error.message || "Error desconocido.")
    );

    show("loginView");
  }
}
