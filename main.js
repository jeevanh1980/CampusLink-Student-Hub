// main.js
document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    // --- Get all navigation elements ---
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');
    const navLogout = document.getElementById('nav-logout');
    const navAccount = document.getElementById('nav-account'); 

    // Homepage Feature Cards (<div> elements)
    const cardLostFound = document.getElementById('card-lost-found');
    const cardStudyHub = document.getElementById('card-study-hub');
    const cardStudeX = document.getElementById('card-studex');
    const cardAlumniConnect = document.getElementById('card-alumni-connect');

    if (token) {
        // --- USER IS LOGGED IN ---
        if (navLogin) navLogin.style.display = 'none';
        if (navSignup) navSignup.style.display = 'none';
        if (navLogout) navLogout.style.display = 'inline-block'; 

        // --- LOGIC FOR ACCOUNT/INBOX LINKS ---
        if (role === 'student') {
            if (navAccount) navAccount.style.display = 'inline-block';
        } else if (role === 'alumni') {
            if (navAccount) navAccount.style.display = 'none'; // Hide "My Account" for alumni
        }
    
        if (role === 'alumni') {
            // Hide feature cards on homepage
            if (cardLostFound) cardLostFound.style.display = 'none';
            if (cardStudyHub) cardStudyHub.style.display = 'none';
            if (cardStudeX) cardStudeX.style.display = 'none';
            
            if (cardAlumniConnect) {
                const link = cardAlumniConnect.querySelector('a');
                if (link) link.href = 'alumni.html';
            }
        }
        
        // Logout functionality
        if (navLogout) {
            navLogout.addEventListener('click', () => { 
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                window.location.href = 'index.html';
            });
        }

    } else {
        // --- USER IS LOGGED OUT ---
        if (navLogin) {
            navLogin.style.display = 'inline-block';
            navLogin.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }
        if (navSignup) {
            navSignup.style.display = 'inline-block';
            navSignup.addEventListener('click', () => {
                window.location.href = 'register.html';
            });
        }
        if (navLogout) {
            navLogout.style.display = 'none';
        }
        if (navAccount) navAccount.style.display = 'none'; 

        // Add click listeners to the cards for logged-out users
        const protectCard = (card) => {
            if (card) {
                const link = card.querySelector('a');
                if (link) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        alert('You must be logged in to use this feature.');
                        window.location.href = 'login.html';
                    });
                }
            }
        };
        
        protectCard(cardLostFound);
        protectCard(cardStudyHub);
        protectCard(cardStudeX);
        protectCard(cardAlumniConnect);
    }
});
