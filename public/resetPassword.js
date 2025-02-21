document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("resetForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const newPasswordError = document.getElementById("newPasswordError");
        const confirmPasswordError = document.getElementById("confirmPasswordError");

        // Reset previous errors
        newPasswordError.textContent = "";
        confirmPasswordError.textContent = "";

        // Validation
        if (newPassword.length < 4) {
            newPasswordError.textContent = "Password must be at least 4 characters long.";
            return;
        }

        if (newPassword !== confirmPassword) {
            confirmPasswordError.textContent = "Passwords do not match!";
            return;
        }

        try {
            const response = await fetch(window.location.pathname, {
                method: "POST",
                headers: {
                    'Content-Type':"application/json",
                },
                body: JSON.stringify({ newPassword: newPassword+'' }),
            });

            const result = await response.json();

            if (result.success) {
                Toastify({
                    text: "✅ Password updated successfully!",
                    duration: 3000,
                    gravity: "top",
                    style:{
                        background: "#4caf50"
                    },
                }).showToast();

                setTimeout(() => window.location.href = "/login", 1800);     //Routed to /login page (frontend)
            } else {
                Toastify({
                    text: `❌ ${result.details || 'Failed to update password.'}`,
                    duration: 3000,
                    gravity: "top",
                    style:{
                        background: "#f44336"
                    },
                }).showToast();
            }
        } catch (error) {
            Toastify({
                text: "❌ Something went wrong. Please try again!",
                duration: 3000,
                gravity: "top",
                style:{
                    background: "#f44336"
                },
            }).showToast();
        }
    });
});
