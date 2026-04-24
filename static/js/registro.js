// AUTO-CLOSE DJANGO MESSAGES
setTimeout(() => {
    const alerts = document.querySelectorAll('.django-alert');
    alerts.forEach(alert => {
        alert.style.transition = 'all 0.3s ease';
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100px)';
        setTimeout(() => alert.remove(), 300);
    });
}, 5000);

// TOGGLE PASSWORD
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling;
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// VALIDACIÓN NOMBRE DE USUARIO
const nombreInput = document.getElementById('nombre');
const nombreValidation = document.getElementById('nombreValidation');

nombreInput.addEventListener('input', function() {
    const usuario = this.value.trim();
    
    if (usuario.length === 0) {
        nombreValidation.className = 'validation-message';
        nombreValidation.textContent = '';
        this.classList.remove('is-valid', 'is-invalid');
        return;
    }

    if (usuario.length < 3) {
        nombreValidation.className = 'validation-message error';
        nombreValidation.innerHTML = '<i class="fas fa-times-circle"></i> El usuario debe tener al menos 3 caracteres';
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (!/^[a-zA-Z0-9_]+$/.test(usuario)) {
        nombreValidation.className = 'validation-message error';
        nombreValidation.innerHTML = '<i class="fas fa-times-circle"></i> El usuario solo puede contener letras, números y guión bajo (_)';
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else {
        nombreValidation.className = 'validation-message success';
        nombreValidation.innerHTML = '<i class="fas fa-check-circle"></i> Usuario válido';
        this.classList.add('is-valid');
        this.classList.remove('is-invalid');
    }
});

// EMAIL VALIDATION
const emailInput = document.getElementById('email');
const emailValidation = document.getElementById('emailValidation');

emailInput.addEventListener('input', function() {
    const email = this.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email.length === 0) {
        emailValidation.className = 'validation-message';
        emailValidation.textContent = '';
        this.classList.remove('is-valid', 'is-invalid');
        return;
    }

    if (!emailRegex.test(email)) {
        emailValidation.className = 'validation-message error';
        emailValidation.innerHTML = '<i class="fas fa-times-circle"></i> Por favor, introduce un correo electrónico válido';
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else {
        emailValidation.className = 'validation-message success';
        emailValidation.innerHTML = '<i class="fas fa-check-circle"></i> Correo electrónico válido';
        this.classList.add('is-valid');
        this.classList.remove('is-invalid');
    }
});

// PASSWORD STRENGTH
const passwordInput = document.getElementById('password');
const strengthIndicator = document.getElementById('passwordStrength');
const passwordValidation = document.getElementById('passwordValidation');

passwordInput.addEventListener('input', function() {
    const password = this.value;
    
    if (password.length === 0) {
        strengthIndicator.classList.remove('active');
        passwordValidation.className = 'validation-message';
        passwordValidation.textContent = '';
        this.classList.remove('is-valid', 'is-invalid');
        return;
    }

    strengthIndicator.classList.add('active');
    
    let strength = 0;
    let messages = [];
    
    if (password.length >= 8) {
        strength++;
    } else {
        messages.push('al menos 8 caracteres');
    }
    
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        strength++;
    } else {
        messages.push('mayúsculas y minúsculas');
    }
    
    if (/\d/.test(password)) {
        strength++;
    } else {
        messages.push('números');
    }
    
    if (/[^a-zA-Z0-9]/.test(password)) {
        strength++;
    } else {
        messages.push('caracteres especiales');
    }

    strengthIndicator.classList.remove('strength-weak', 'strength-medium', 'strength-strong');
    const strengthText = strengthIndicator.querySelector('.strength-text');

    if (strength <= 1) {
        strengthIndicator.classList.add('strength-weak');
        strengthText.textContent = 'Contraseña débil';
        strengthText.style.color = 'var(--color-danger)';
        passwordValidation.className = 'validation-message error';
        passwordValidation.innerHTML = `<i class="fas fa-times-circle"></i> Tu contraseña necesita: ${messages.join(', ')}`;
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (strength <= 3) {
        strengthIndicator.classList.add('strength-medium');
        strengthText.textContent = 'Contraseña media';
        strengthText.style.color = 'var(--color-warning)';
        if (messages.length > 0) {
            passwordValidation.className = 'validation-message warning';
            passwordValidation.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Considera añadir: ${messages.join(', ')}`;
            this.classList.remove('is-valid', 'is-invalid');
        } else {
            passwordValidation.className = 'validation-message';
            passwordValidation.textContent = '';
            this.classList.remove('is-valid', 'is-invalid');
        }
    } else {
        strengthIndicator.classList.add('strength-strong');
        strengthText.textContent = 'Contraseña fuerte';
        strengthText.style.color = 'var(--color-success)';
        passwordValidation.className = 'validation-message success';
        passwordValidation.innerHTML = '<i class="fas fa-check-circle"></i> ¡Excelente! Contraseña muy segura';
        this.classList.add('is-valid');
        this.classList.remove('is-invalid');
    }
});

// PASSWORD MATCH VALIDATION
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordMatchMsg = document.getElementById('passwordMatch');

function validatePasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword.length === 0) {
        passwordMatchMsg.className = 'validation-message';
        passwordMatchMsg.textContent = '';
        confirmPasswordInput.classList.remove('is-valid', 'is-invalid');
        return;
    }

    if (password !== confirmPassword) {
        passwordMatchMsg.className = 'validation-message error';
        passwordMatchMsg.innerHTML = '<i class="fas fa-times-circle"></i> Las contraseñas no coinciden. Por favor, verifica que sean iguales';
        confirmPasswordInput.classList.add('is-invalid');
        confirmPasswordInput.classList.remove('is-valid');
    } else {
        passwordMatchMsg.className = 'validation-message success';
        passwordMatchMsg.innerHTML = '<i class="fas fa-check-circle"></i> Las contraseñas coinciden perfectamente';
        confirmPasswordInput.classList.add('is-valid');
        confirmPasswordInput.classList.remove('is-invalid');
    }
}

confirmPasswordInput.addEventListener('input', validatePasswordMatch);
passwordInput.addEventListener('input', () => {
    if (confirmPasswordInput.value.length > 0) {
        validatePasswordMatch();
    }
});


// VALIDACIÓN TÉRMINOS
const termsCheckbox = document.getElementById('terms');
const termsValidation = document.getElementById('termsValidation');
const btnRegister = document.getElementById('btnRegister');

termsCheckbox.addEventListener('change', function() {
    btnRegister.disabled = !this.checked;
    
    if (!this.checked && termsValidation.textContent) {
        termsValidation.className = 'validation-message error';
        termsValidation.innerHTML = '<i class="fas fa-times-circle"></i> Debes aceptar los términos y condiciones para continuar';
    } else {
        termsValidation.className = 'validation-message';
        termsValidation.textContent = '';
    }
});

// Inicialmente deshabilitado
btnRegister.disabled = true;

// SUBMIT FORM
document.getElementById('registerForm').addEventListener('submit', function(e) {
    const nombre = nombreInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const terms = termsCheckbox.checked;

    let isValid = true;

    // Validación nombre
    if (nombre.length < 3 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
        nombreValidation.className = 'validation-message error';
        nombreValidation.innerHTML = '<i class="fas fa-times-circle"></i> Por favor, introduce un nombre válido (solo letras, mínimo 3 caracteres)';
        nombreInput.classList.add('is-invalid');
        isValid = false;
    }

    // Validación email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailValidation.className = 'validation-message error';
        emailValidation.innerHTML = '<i class="fas fa-times-circle"></i> Por favor, introduce un correo electrónico válido';
        emailInput.classList.add('is-invalid');
        isValid = false;
    }

    // Validación contraseña
    if (password.length < 8) {
        passwordValidation.className = 'validation-message error';
        passwordValidation.innerHTML = '<i class="fas fa-times-circle"></i> La contraseña debe tener al menos 8 caracteres';
        passwordInput.classList.add('is-invalid');
        isValid = false;
    }

    // Validación contraseñas coinciden
    if (password !== confirmPassword) {
        passwordMatchMsg.className = 'validation-message error';
        passwordMatchMsg.innerHTML = '<i class="fas fa-times-circle"></i> Las contraseñas no coinciden. Por favor, verifica que ambas sean iguales';
        confirmPasswordInput.classList.add('is-invalid');
        isValid = false;
    }

    // Validación términos
    if (!terms) {
        termsValidation.className = 'validation-message error';
        termsValidation.innerHTML = '<i class="fas fa-times-circle"></i> Debes aceptar los términos y condiciones para continuar';
        isValid = false;
    }

    if (!isValid) {
        e.preventDefault();
        
        // Scroll al primer error
        const firstError = document.querySelector('.validation-message.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return false;
    }

    // Si todo es válido, mostrar loading
    // ✅ CAMBIO: Ya no prevenimos el envío, dejamos que Django lo maneje
    Swal.fire({
        title: 'Creando tu cuenta...',
        html: 'Por favor espera un momento',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // El formulario se enviará automáticamente a Django
});

// SOCIAL REGISTER
function registerWithGoogle() {
    Swal.fire({
        icon: 'info',
        title: 'Registro con Google',
        text: 'Redirigiendo a Google...',
        confirmButtonColor: '#10B981',
        timer: 2000
    });
}

function registerWithFacebook() {
    Swal.fire({
        icon: 'info',
        title: 'Registro con Facebook',
        text: 'Redirigiendo a Facebook...',
        confirmButtonColor: '#10B981',
        timer: 2000
    });
}