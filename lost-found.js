// lost-found.js (With Ownership Check)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GET ALL ELEMENTS ---
    const API_URL = 'http://localhost:3001/api/lost-and-found';
    const lostTab = document.getElementById('lostTab');
    const foundTab = document.getElementById('foundTab');
    const lostFormSection = document.getElementById('lostForm');
    const foundFormSection = document.getElementById('foundForm');
    const lostList = document.getElementById('lostList');
    const foundList = document.getElementById('foundList');
    const lostForm = document.getElementById('addLostForm');
    const foundForm = document.getElementById('addFoundForm');
    const searchLostBox = document.getElementById('searchLostBox');
    const searchFoundBox = document.getElementById('searchFoundBox');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModal = document.getElementById('closeModal');
    
    // --- Get token and user ID ---
    const token = localStorage.getItem('token');
    const myUserId = parseJwt(token)?.user.id;
    let allItems = [];

    // --- 2. TAB SWITCHING LOGIC ---
    lostTab.onclick = () => {
        lostTab.classList.add('active');
        foundTab.classList.remove('active');
        lostFormSection.classList.add('active');
        foundFormSection.classList.remove('active');
    };
    foundTab.onclick = () => {
        foundTab.classList.add('active');
        lostTab.classList.remove('active');
        foundFormSection.classList.add('active');
        lostFormSection.classList.remove('active');
    };

   // --- 3. RENDER ALL ITEMS ---
    function renderItems() {
        lostList.innerHTML = '';
        const lostQuery = searchLostBox.value.trim().toLowerCase();
        let lostItems = allItems.filter(item => item.type === 'lost');

        if (lostQuery) {
            lostItems = lostItems.filter(item =>
                item.title.toLowerCase().includes(lostQuery) ||
                item.description.toLowerCase().includes(lostQuery)
            );
        }
        if (lostItems.length > 0) {
            lostItems.forEach(item => lostList.appendChild(createItemCard(item)));
        } else {
            lostList.innerHTML = '<p>No matching lost items.</p>';
        }

        foundList.innerHTML = '';
        const foundQuery = searchFoundBox.value.trim().toLowerCase(); 
        let foundItems = allItems.filter(item => item.type === 'found');

        if (foundQuery) {
            foundItems = foundItems.filter(item =>
                item.title.toLowerCase().includes(foundQuery) ||
                item.description.toLowerCase().includes(foundQuery)
            );
        }
        if (foundItems.length > 0) {
            foundItems.forEach(item => foundList.appendChild(createItemCard(item)));
        } else {
            foundList.innerHTML = '<p>No matching found items.</p>';
        }
    }

    // --- 4. CREATE A SINGLE ITEM CARD ---
    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        let imageHtml = '';
        if (item.imagePath) {
            imageHtml = `<img src="http://localhost:3001${item.imagePath}" alt="${item.title}" class="post-image">`;
        }
        
        let claimButtonHtml = '';
        // Only show the button if the logged-in user is the one who posted it
        if (item.user_id === myUserId) {
            claimButtonHtml = `<button class="btn-claim" data-id="${item.id}">Mark as Claimed</button>`;
        }

        card.innerHTML = `
            ${imageHtml}
            <h3>${item.title}</h3>
            <p><b>Location:</b> ${item.location}</p>
            <p>${item.description}</p> 
            <p><b>Contact:</b> ${item.contact}</p>
            ${claimButtonHtml}
        `;
        return card;
    }

    // --- 5. FETCH ALL ITEMS ---
    async function fetchAllItems() {
        try {
            const response = await fetch(API_URL); // No auth needed to GET
            allItems = await response.json();
            renderItems();
        } catch (error) {
            console.error('Error fetching items:', error);
            lostList.innerHTML = '<p>Failed to load items. Is the backend running?</p>';
        }
    }

    // --- 6. HANDLE FORM SUBMIT ---
    async function handleFormSubmit(event, type) {
        event.preventDefault(); 
        
        if (!token) {
            alert('You must be logged in to post an item.');
            return;
        }
        
        const form = (type === 'lost') ? lostForm : foundForm;
        const formData = new FormData(form);
        formData.append('type', type);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });
            if (!response.ok) throw new Error('Server error');
            form.reset(); 
            fetchAllItems();
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit post. Check console.');
        }
    }

    // --- 7. HANDLE CLICKS ON THE LISTS (CLAIM & IMAGE) ---
    async function handleListClick(event) {
        
        // A. MARK AS CLAIMED LOGIC
        if (event.target.classList.contains('btn-claim')) {
            if (!token) {
                alert('You must be logged in to claim an item.');
                return;
            }
            if (!confirm("Are you sure you want to mark this as claimed? This will remove the post.")) return;
            
            const id = event.target.dataset.id;
            try {
                const response = await fetch(`${API_URL}/claim/${id}`, { 
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to claim.');
                }
                
                fetchAllItems(); // Refresh main lists
            } catch (error) {
                console.error('Error claiming item:', error);
                alert(`Error: ${error.message}`);
            }
        }
    
        // B. IMAGE MODAL LOGIC
        if (event.target.classList.contains('post-image')) {
            imageModal.style.display = "block";
            modalImage.src = event.target.src;
        }
    }

   
    // --- 8. UTILITY FUNCTION (to get user ID) ---
    function parseJwt (token) {
        if (!token) { return null; }
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    // --- 9. ATTACH ALL EVENT LISTENERS ---
    
    fetchAllItems(); // Initial fetch
    lostForm.addEventListener('submit', (e) => handleFormSubmit(e, 'lost'));
    foundForm.addEventListener('submit', (e) => handleFormSubmit(e, 'found'));
    lostList.addEventListener('click', handleListClick);
    foundList.addEventListener('click', handleListClick);
    searchLostBox.addEventListener('input', renderItems);
    searchFoundBox.addEventListener('input', renderItems);

    // Modal Close Buttons
    closeModal.onclick = function() {
        imageModal.style.display = "none";
    }
    imageModal.onclick = function(event) {
        if (event.target == imageModal) {
            imageModal.style.display = "none";
        }
    }
});