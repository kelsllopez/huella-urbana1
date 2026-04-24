document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();

            Swal.fire({
                title: 'Enviando mensaje...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Simular envío
            setTimeout(() => {
                Swal.fire({
                    icon: 'success',
                    title: '¡Mensaje Enviado!',
                    text: 'Te responderemos a la brevedad. Revisa tu correo.',
                    confirmButtonColor: '#10B981'
                });
                this.reset();
            }, 2000);
        });