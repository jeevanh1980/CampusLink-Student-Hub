document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    // --- NEW: Get header buttons ---
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');

    // --- NEW: Swap button styles to show "Login" as active ---
    if (navLogin) {
        navLogin.classList.remove('btn-login'); // Remove transparent style
        navLogin.classList.add('btn-signup');   // Add filled style
    }
    if (navSignup) {
        navSignup.classList.remove('btn-signup'); // Remove filled style
        navSignup.classList.add('btn-login');   // Add transparent style
    }
    // --- End of new code ---

    // Helper function to validate email format
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const email = emailInput.value;
        const password = passwordInput.value;

        // Custom Validation
        if (!isValidEmail(email)) {
            errorMessage.textContent = 'Invalid email address format.';
            errorMessage.style.display = 'block';
            return; 
        }

        // Check for allowed domains
        const isAllowedDomain = email.endsWith('@gmail.com') || 
                              email.endsWith('@acharya.ac.in') || 
                              email.endsWith('@yahoo.com');

        if (!isAllowedDomain) {
            errorMessage.textContent = 'Please use a valid email (e.g., @gmail.com, @acharya.ac.in, @yahoo.com).';
            errorMessage.style.display = 'block';
            return; 
        }

        const loginData = {
            email: email,
            password: password,
        };

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            window.location.href = 'index.html'; 

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
});