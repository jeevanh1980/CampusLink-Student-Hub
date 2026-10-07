// studex.js (With Ownership Check)
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GET ALL ELEMENTS ---
    const API_URL = 'http://localhost:3001/api/studex'; 
    const form = document.getElementById('addItemForm');
    const itemList = document.getElementById('itemList');
    const searchBox = document.getElementById('searchItems');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModal = document.getElementById('closeModal');

    // --- NEW: Get token and user ID ---
    const token = localStorage.getItem('token');
    const myUserId = parseJwt(token)?.user.id;
    let allItems = []; 

    // --- 2. RENDER ITEMS ---
    function renderItems() {
        itemList.innerHTML = '';
        const query = searchBox.value.trim().toLowerCase();
        let filteredItems = allItems;
        if (query) {
            filteredItems = allItems.filter(item =>
                item.title.toLowerCase().includes(query) ||
                (item.author && item.author.toLowerCase().includes(query)) ||
                item.description.toLowerCase().includes(query)
            );
        }
        if (filteredItems.length === 0) {
            itemList.innerHTML = '<p>No matching items found.</p>';
            return;
        }
        filteredItems.forEach(item => {
            itemList.appendChild(createItemCard(item));
        });
    }

    // --- 3. CREATE A SINGLE ITEM CARD ---
    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        let imageHtml = '';
        if (item.imagePath) {
            imageHtml = `<img src="http://localhost:3001${item.imagePath}" alt="${item.title}" class="post-image">`;
        }

        // --- NEW: Ownership Check ---
        let deleteButtonHtml = '';
        // Only show the button if the logged-in user is the one who posted it
        if (item.user_id === myUserId) {
            deleteButtonHtml = `<button class="btn-claim" data-id="${item.id}">Mark as Traded</button>`;
        }

        card.innerHTML = `
            ${imageHtml}
            <h3>${item.title}</h3>
            <p><b>Author/Course:</b> ${item.author || 'N/A'}</p>
            <p><b>Details:</b> ${item.description}</p>
            <p><b>Contact:</b> ${item.contact}</p>
            ${deleteButtonHtml}
        `;
        return card;
    }

    // --- 4. FETCH ALL ITEMS ---
    async function fetchAllItems() {
        try {
            const response = await fetch(API_URL); // No auth needed to GET
            allItems = await response.json();
            renderItems(); // Initial render
        } catch (error) {
            console.error('Error fetching items:', error);
            itemList.innerHTML = '<p>Failed to load items. Is the backend running?</p>';
        }
    }

    // --- 5. HANDLE FORM SUBMIT ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        if (!token) {
            alert('You must be logged in to post an item.');
            return;
        }
        
        const formData = new FormData(form);
        
        try {
            // --- NEW: Send Authorization token ---
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });
            if (!response.ok) throw new Error('Server error');
            form.reset();
            await fetchAllItems(); // Refresh the list
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit post.');
        }
    }

    // --- 6. HANDLE CLICKS (DELETE & IMAGE) ---
    async function handleListClick(event) {
        
        // A. DELETE ITEM
        if (event.target.classList.contains('btn-claim')) {
            if (!token) {
                alert('You must be logged in to delete an item.');
                return;
            }
            if (!confirm('Are you sure you want to permanently remove this post?')) return; 
            
            const id = event.target.dataset.id;
            try {
                // --- NEW: Send Authorization token ---
                const response = await fetch(`${API_URL}/${id}`, { 
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }); 
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to delete.');
                }
                
                await fetchAllItems(); // Refresh list
            } catch (error) {
                console.error('Error deleting item:', error);
                alert(`Error: ${error.message}`);
            }
        }
    
        // B. IMAGE MODAL
        if (event.target.classList.contains('post-image')) {
            imageModal.style.display = "block";
            modalImage.src = event.target.src;
        }
    }
    
    // --- 7. UTILITY FUNCTION (to get user ID) ---
    function parseJwt (token) {
        if (!token) { return null; }
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    // --- 8. ATTACH EVENT LISTENERS ---
    fetchAllItems(); // Initial fetch
    form.addEventListener('submit', handleFormSubmit);
    itemList.addEventListener('click', handleListClick);
    searchBox.addEventListener('input', renderItems); // Live search

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