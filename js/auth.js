// Navegación entre las vistas de inicio de sesión y registro.
document.querySelectorAll("[data-show]").forEach(link => {
  link.onclick = event => {
    event.preventDefault();

    message("#loginMessage", "");
    message("#registerMessage", "");
    show(link.dataset.show);
  };
});

// Inicio de sesión mediante el backend de Render.
$("#loginForm").onsubmit = async event => {
  event.preventDefault();
  message("#loginMessage", "");

  const button = $("#loginBtn");
  button.disabled = true;
  button.textContent = "Ingresando...";

  try {
    const result = await window.AMARApi.login({
      email: $("#loginEmail").value.trim(),
      password: $("#loginPassword").value
    });

    message(
      "#loginMessage",
      "Ingreso correcto. Cargando panel...",
      true
    );

    await loadDashboard(result.user);
  } catch (error) {
    message(
      "#loginMessage",
      error.message || "No se pudo iniciar sesión."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Ingresar";
  }
};

// Registro mediante el backend de Render.
$("#registerForm").onsubmit = async event => {
  event.preventDefault();
  message("#registerMessage", "");

  const button = $("#registerBtn");
  button.disabled = true;
  button.textContent = "Creando cuenta...";

  const email = $("#registerEmail").value.trim();
  const name = $("#name").value.trim();
  const password = $("#registerPassword").value;

  try {
    const result = await window.AMARApi.register({
      email,
      password,
      name
    });

    $("#loginEmail").value = email;

    message(
      "#registerMessage",
      "Cuenta creada. Cargando panel...",
      true
    );

    await loadDashboard(result.user);
  } catch (error) {
    message(
      "#registerMessage",
      error.message || "No se pudo crear la cuenta."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Crear cuenta";
  }
};