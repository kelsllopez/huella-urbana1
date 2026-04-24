// ===========================================
// MOSTRAR/OCULTAR CONTRASEÑA
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", function() {
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            
            // Cambiar icono
            this.classList.toggle("fa-eye");
            this.classList.toggle("fa-eye-slash");
        });
    }

    // ===========================================
    // MANEJO DE ERRORES DE DJANGO Y CONTEXTO
    // ===========================================
    
    // Errores del formulario Django (form.errors)
    const djangoErrors = document.querySelectorAll(".django-error");
    
    djangoErrors.forEach(err => {
        const field = err.getAttribute("data-field");
        const errorText = err.innerText;
        
        mostrarError(field, errorText);
    });
    
    // Errores pasados directamente en el contexto (username_error, password_error)
    const usernameContextError = document.getElementById("username-context-error");
    const passwordContextError = document.getElementById("password-context-error");
    
    if (usernameContextError) {
        const errorText = usernameContextError.textContent.trim();
        if (errorText) {
            mostrarError("username", errorText);
        }
    }
    
    if (passwordContextError) {
        const errorText = passwordContextError.textContent.trim();
        if (errorText) {
            mostrarError("password", errorText);
        }
    }
    
    // ===========================================
    // FUNCIÓN AUXILIAR PARA MOSTRAR ERRORES
    // ===========================================
    function mostrarError(field, errorText) {
        if (field === "username") {
            const usernameError = document.getElementById("username-error");
            const usernameInput = document.getElementById("username");
            
            if (usernameError && usernameInput) {
                usernameError.textContent = errorText;
                usernameError.classList.add("show");
                usernameInput.classList.add("error");
            }
        } 
        
        if (field === "password") {
            const passwordError = document.getElementById("password-error");
            const passwordInputField = document.getElementById("password");
            
            if (passwordError && passwordInputField) {
                passwordError.textContent = errorText;
                passwordError.classList.add("show");
                passwordInputField.classList.add("error");
            }
        }
        
        if (field === "__all__" || field === "general") {
            const generalError = document.getElementById("general-error");
            
            if (generalError) {
                generalError.textContent = errorText;
                generalError.classList.add("show");
            }
        }
    }
    
    // ===========================================
    // LIMPIAR ERRORES AL ESCRIBIR
    // ===========================================
    const inputs = document.querySelectorAll(".form-control-custom");
    
    inputs.forEach(input => {
        input.addEventListener("input", function() {
            // Quitar clase de error del input
            this.classList.remove("error");
            
            // Ocultar mensaje de error correspondiente
            const errorDiv = this.closest(".form-group").querySelector(".error-message");
            if (errorDiv) {
                errorDiv.classList.remove("show");
            }
            
            // Ocultar error general si existe
            const generalError = document.getElementById("general-error");
            if (generalError) {
                generalError.classList.remove("show");
            }
        });
    });

    // ===========================================
    // VALIDACIÓN BÁSICA DEL FORMULARIO
    // ===========================================
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        loginForm.addEventListener("submit", function(e) {
            let isValid = true;
            
            // Validar username
            const usernameInput = document.getElementById("username");
            const usernameError = document.getElementById("username-error");
            
            if (usernameInput.value.trim() === "") {
                e.preventDefault();
                usernameInput.classList.add("error");
                usernameError.textContent = "Este campo es obligatorio";
                usernameError.classList.add("show");
                isValid = false;
            }
            
            // Validar password
            const passwordInputField = document.getElementById("password");
            const passwordError = document.getElementById("password-error");
            
            if (passwordInputField.value.trim() === "") {
                e.preventDefault();
                passwordInputField.classList.add("error");
                passwordError.textContent = "Este campo es obligatorio";
                passwordError.classList.add("show");
                isValid = false;
            }
        });
    }
});

// ===========================================
// FUNCIONES DE LOGIN SOCIAL (PLACEHOLDER)
// ===========================================
function loginWithGoogle() {
    alert("Función de login con Google no implementada aún");
    // Aquí irá la lógica de OAuth con Google
}

function loginWithFacebook() {
    alert("Función de login con Facebook no implementada aún");
    // Aquí irá la lógica de OAuth con Facebook
}