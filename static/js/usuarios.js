class UsuariosManager {
    constructor() {
        this.config = window.APP_CONFIG;
        this.init();
    }

    init() {
        this.setupSearchFilter();
        this.setupRoleFilters();
        this.setupEventListeners();
    }

    setupSearchFilter() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterBySearch(e));
        }
    }

    setupRoleFilters() {
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.filterByRole(e));
        });
    }

    setupEventListeners() {
        document.querySelectorAll('#btnAddUser, #btnAddUserEmpty').forEach(btn => {
            btn.addEventListener('click', () => this.addUser());
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.id;
                this.editUser(userId);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.id;
                const username = e.currentTarget.dataset.username;
                this.deleteUser(userId, username);
            });
        });
    }

    filterBySearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll('.user-row');
        
        rows.forEach(row => {
            const name = row.dataset.name;
            const email = row.dataset.email;
            
            if (name.includes(searchTerm) || email.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterByRole(e) {
        const tab = e.currentTarget;
        
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const filter = tab.dataset.filter;
        const rows = document.querySelectorAll('.user-row');
        
        rows.forEach(row => {
            if (filter === 'all' || row.dataset.role === filter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    addUser() {
        Swal.fire({
            title: 'Crear Nuevo Usuario',
            html: `
                <div class="swal-form">
                    <div class="swal-field">
                        <label><i class="fas fa-user"></i> Nombre completo</label>
                        <input id="swal-name" class="swal2-input" placeholder="Ej: Juan Pérez">
                    </div>
                    <div class="swal-field">
                        <label><i class="fas fa-at"></i> Nombre de usuario</label>
                        <input id="swal-username" class="swal2-input" placeholder="Ej: juanperez">
                    </div>
                    <div class="swal-field">
                        <label><i class="fas fa-envelope"></i> Email</label>
                        <input id="swal-email" class="swal2-input" type="email" placeholder="Ej: juan@email.com">
                    </div>
                    <div class="swal-field">
                        <label><i class="fas fa-lock"></i> Contraseña</label>
                        <input id="swal-password" class="swal2-input" type="password" placeholder="Mínimo 8 caracteres">
                    </div>
                    <div class="swal-field">
                        <label><i class="fas fa-tag"></i> Rol</label>
                        <select id="swal-role" class="swal2-select">
                            <option value="">Selecciona un rol</option>
                            <option value="moderador">Moderador</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>
            `,
            confirmButtonText: '<i class="fas fa-plus"></i> Crear Usuario',
            confirmButtonColor: '#4F46E5',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            preConfirm: this.validateUserForm
        }).then(result => {
            if (result.isConfirmed) {
                this.submitNewUser(result.value);
            }
        });
    }

    validateUserForm() {
        const name = document.getElementById("swal-name").value.trim();
        const username = document.getElementById("swal-username").value.trim();
        const email = document.getElementById("swal-email").value.trim();
        const password = document.getElementById("swal-password").value;
        const role = document.getElementById("swal-role").value;
        
        if (!name || !username || !email || !password || !role) {
            Swal.showValidationMessage("Todos los campos son obligatorios");
            return false;
        }
        
        if (password.length < 8) {
            Swal.showValidationMessage("La contraseña debe tener al menos 8 caracteres");
            return false;
        }
        
        return { name, username, email, password, role };
    }

    async submitNewUser(userData) {
        try {
            const response = await fetch(this.config.urls.crearUsuario, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-CSRFToken": this.config.csrfToken
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                await Swal.fire({
                    title: '¡Usuario Creado!',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#4F46E5'
                });
                location.reload();
            } else {
                await Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error',
                    confirmButtonColor: '#4F46E5'
                });
            }
        } catch (error) {
            console.error('Error al crear usuario:', error);
            await Swal.fire({
                title: 'Error',
                text: 'Ocurrió un error al crear el usuario',
                icon: 'error',
                confirmButtonColor: '#4F46E5'
            });
        }
    }

    async editUser(id) {
        try {
            const response = await fetch(`${this.config.urls.editarUsuario}${id}/editar/`);
            const data = await response.json();
            
            const result = await Swal.fire({
                title: 'Editar Usuario',
                html: this.getEditFormHTML(data),
                confirmButtonText: '<i class="fas fa-save"></i> Guardar Cambios',
                confirmButtonColor: '#4F46E5',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const name = document.getElementById('edit-name').value.trim();
                    const email = document.getElementById('edit-email').value.trim();
                    const role = document.getElementById('edit-role').value;
                    
                    if (!name || !email || !role) {
                        Swal.showValidationMessage("Todos los campos son obligatorios");
                        return false;
                    }
                    
                    return { name, email, role };
                }
            });
            
            if (result.isConfirmed) {
                await this.updateUser(id, result.value);
            }
        } catch (error) {
            console.error('Error al editar usuario:', error);
        }
    }

    getEditFormHTML(data) {
        return `
            <div class="swal-form">
                <div class="swal-field">
                    <label><i class="fas fa-user"></i> Nombre completo</label>
                    <input id="edit-name" class="swal2-input" value="${this.escapeHtml(data.name)}">
                </div>
                <div class="swal-field">
                    <label><i class="fas fa-envelope"></i> Email</label>
                    <input id="edit-email" class="swal2-input" type="email" value="${this.escapeHtml(data.email)}">
                </div>
                <div class="swal-field">
                    <label><i class="fas fa-tag"></i> Rol</label>
                    <select id="edit-role" class="swal2-select">
                        <option value="usuario" ${data.role === "usuario" ? "selected" : ""}>Usuario</option>
                        <option value="moderador" ${data.role === "moderador" ? "selected" : ""}>Moderador</option>
                        <option value="admin" ${data.role === "admin" ? "selected" : ""}>Administrador</option>
                    </select>
                </div>
            </div>
        `;
    }

    async updateUser(id, userData) {
        try {
            const response = await fetch(`${this.config.urls.editarUsuario}${id}/editar/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": this.config.csrfToken
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            await Swal.fire({
                title: '¡Actualizado!',
                text: data.message,
                icon: 'success',
                confirmButtonColor: '#4F46E5'
            });
            
            location.reload();
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
        }
    }

    deleteUser(id, username) {
        Swal.fire({
            title: '¿Eliminar Usuario?',
            html: `
                <p>Estás a punto de eliminar permanentemente a <strong>@${this.escapeHtml(username)}</strong>.</p>
                <p class="warning-text">Esta acción no se puede deshacer.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-trash"></i> Sí, Eliminar',
            confirmButtonColor: '#DC2626',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await this.confirmDeleteUser(id);
            }
        });
    }

    async confirmDeleteUser(id) {
        try {
            const response = await fetch(`${this.config.urls.eliminarUsuario}${id}/eliminar/`, {
                method: "DELETE",
                headers: { 
                    "X-CSRFToken": this.config.csrfToken 
                }
            });
            
            const data = await response.json();
            
            await Swal.fire({
                title: 'Usuario Eliminado',
                text: data.message,
                icon: 'success',
                confirmButtonColor: '#4F46E5'
            });
            
            location.reload();
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UsuariosManager();
});