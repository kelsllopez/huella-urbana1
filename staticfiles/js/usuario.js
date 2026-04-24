// BÚSQUEDA
document.querySelector('.search-input').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.user-card');

    cards.forEach(card => {
        const name = card.querySelector('.user-name').textContent.toLowerCase();
        const email = card.querySelector('.user-stat-item strong').textContent.toLowerCase();

        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            card.parentElement.style.display = 'block';
        } else {
            card.parentElement.style.display = 'none';
        }
    });
});

// AGREGAR USUARIO
function addUser() {
    Swal.fire({
        title: 'Agregar Nuevo Usuario',
        html: `
            <input id="swal-name" class="swal2-input" placeholder="Nombre completo">
            <input id="swal-email" class="swal2-input" placeholder="Email">
            <select id="swal-role" class="swal2-input">
                <option value="">Selecciona un rol</option>
                <option value="user">Usuario</option>
                <option value="moderator">Moderador</option>
                <option value="admin">Administrador</option>
            </select>
        `,
        confirmButtonText: 'Crear Usuario',
        confirmButtonColor: '#8B5CF6',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: () => {
            const name = document.getElementById('swal-name').value;
            const email = document.getElementById('swal-email').value;
            const role = document.getElementById('swal-role').value;

            if (!name || !email || !role) {
                Swal.showValidationMessage('Todos los campos son requeridos');
                return false;
            }

            return { name, email, role };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                icon: 'success',
                title: '¡Usuario Creado!',
                text: `${result.value.name} ha sido agregado exitosamente`,
                confirmButtonColor: '#10B981'
            });
        }
    });
}

// EDITAR USUARIO
document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', function() {
        const card = this.closest('.user-card');
        const name = card.querySelector('.user-name').textContent;

        Swal.fire({
            title: `Editar Usuario: ${name}`,
            html: `
                <input id="edit-name" class="swal2-input" placeholder="Nombre" value="${name}">
                <input id="edit-email" class="swal2-input" placeholder="Email">
                <select id="edit-role" class="swal2-input">
                    <option value="user">Usuario</option>
                    <option value="moderator">Moderador</option>
                    <option value="admin">Administrador</option>
                </select>
            `,
            confirmButtonText: 'Guardar Cambios',
            confirmButtonColor: '#8B5CF6',
            showCancelButton: true,
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Cambios Guardados',
                    text: 'El usuario ha sido actualizado',
                    confirmButtonColor: '#10B981'
                });
            }
        });
    });
});

// ELIMINAR USUARIO
document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', function() {
        const card = this.closest('.user-card');
        const name = card.querySelector('.user-name').textContent;

        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará permanentemente a ${name}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                card.parentElement.remove();
                Swal.fire({
                    icon: 'success',
                    title: 'Usuario Eliminado',
                    text: 'El usuario ha sido eliminado del sistema',
                    confirmButtonColor: '#10B981'
                });
            }
        });
    });
});