document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const roleInput = document.getElementById('role');
    const errorMessage = document.getElementById('error-message');

    // Helper function to validate email format
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const email = emailInput.value;
        const password = passwordInput.value;
        const role = roleInput.value;

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

        const registerData = {
            email: email,
            password: password,
            role: role
        };

        try {
            const response = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registerData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            alert('Registration successful! Please log in.');
            window.location.href = 'login.html'; 

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
});