// study-hub.js (With Search & Ownership)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GET ALL ELEMENTS ---
    const API_URL = 'http://localhost:3001/api/study-groups';
    const groupsGrid = document.getElementById('groups-grid');
    const form = document.getElementById('study-group-form');
    const loadingMessage = document.getElementById('loading-message');
    const searchBox = document.getElementById('search-groups'); // <-- NEW
    
    const token = localStorage.getItem('token');
    const myUserId = parseJwt(token)?.user.id;
    
    let allGroups = []; // <-- NEW: To cache all groups for searching

    // --- 2. CREATE A SINGLE GROUP CARD (HELPER) ---
    function createGroupCard(group) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.groupId = group.id; 

        let deleteButtonHtml = '';
        if (group.user_id === myUserId) {
            deleteButtonHtml = `<button class="btn-group-delete" data-id="${group.id}">Delete Group</button>`;
        }
        
        let interestButtonHtml = '';
        if (group.is_interested) {
            interestButtonHtml = `<button class="btn-not-interested interest-toggle-btn" data-id="${group.id}" data-interested="true">Not Interested</button>`;
        } else {
            interestButtonHtml = `<button class="btn-interest interest-toggle-btn" data-id="${group.id}" data-interested="false">I'm Interested!</button>`;
        }
        
        card.innerHTML = `
            <h3>${group.subject}</h3>
            <p><b>Location:</b> ${group.location}</p>
            <p>${group.description}</p>
            ${deleteButtonHtml} 

            <div class="interest-section">
                <span class="interest-count" id="interest-count-${group.id}">
                    ${group.interest_count} students are interested
                </span>
                ${interestButtonHtml}
            </div>

            <div class="comments-section">
                <h4>Discussion</h4>
                <div class="comments-list" id="comments-for-${group.id}">
                    <p class="comment-loading">Loading comments...</p>
                </div>
                <form class="comment-form" data-group-id="${group.id}">
                    <input type="text" placeholder="Add a comment..." required>
                    <button type="submit" class="comment-submit-btn">Post</button>
                </form>
            </div>
        `;
        return card;
    }

    // --- 3. FETCH AND DISPLAY ALL COMMENTS FOR A GROUP ---
    async function fetchAndDisplayComments(groupId) {
        const commentsList = document.getElementById(`comments-for-${groupId}`);
        if (!commentsList) return; 
        try {
            const response = await fetch(`${API_URL}/${groupId}/comments`);
            const comments = await response.json();
            commentsList.innerHTML = ''; 
            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="comment-item">No comments yet.</p>';
                return;
            }
            comments.forEach(comment => {
                const commentEl = document.createElement('p');
                commentEl.className = 'comment-item';
                const emailNode = document.createElement('strong');
                emailNode.textContent = `${comment.user_email}: `;
                const textNode = document.createTextNode(comment.comment_text);
                commentEl.appendChild(emailNode);
                commentEl.appendChild(textNode);
                commentsList.appendChild(commentEl);
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            commentsList.innerHTML = '<p class="comment-item">Failed to load comments.</p>';
        }
    }
    
    // --- 4. NEW: RENDER GROUPS (with search filter) ---
    function renderGroups() {
        const query = searchBox.value.trim().toLowerCase();
        let filteredGroups = allGroups;

        if (query) {
            filteredGroups = allGroups.filter(group =>
                group.subject.toLowerCase().includes(query) ||
                group.location.toLowerCase().includes(query) ||
                group.description.toLowerCase().includes(query)
            );
        }

        groupsGrid.innerHTML = ''; // Clear the grid
        if (filteredGroups.length === 0) {
            groupsGrid.innerHTML = '<p>No study groups match your search.</p>';
            return;
        }

        filteredGroups.forEach(group => {
            const card = createGroupCard(group);
            groupsGrid.appendChild(card);
            // We must fetch comments *after* rendering the card
            fetchAndDisplayComments(group.id);
        });
    }

    // --- 5. FETCH ALL GROUPS (MAIN FUNCTION) ---
    async function fetchAndDisplayGroups() {
        if (!token) {
            groupsGrid.innerHTML = '<p>You must be logged in to view study groups.</p>';
            if (loadingMessage) loadingMessage.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to load groups. Are you logged in?');
            
            allGroups = await response.json(); // Save to cache
            renderGroups(); // Render based on cache (and search)

        } catch (error) {
            console.error('Error fetching groups:', error);
            if(loadingMessage) loadingMessage.innerText = error.message;
            else groupsGrid.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // --- 6. HANDLE "CREATE GROUP" FORM SUBMISSION ---
    async function handleGroupFormSubmit(event) {
        event.preventDefault();
        if (!token) {
            alert('You must be logged in to create a group.');
            return;
        }
        const formData = new FormData(form);
        const newGroup = {
            subject: formData.get('subject'),
            location: formData.get('location'),
            description: formData.get('description'),
        };
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newGroup),
            });
            if (!response.ok) throw new Error('Server error');
            form.reset(); 
            fetchAndDisplayGroups(); // Refresh list
        } catch (error) {
            console.error('Error submitting group:', error);
            alert('Failed to submit new group.');
        }
    }

    // --- 7. HANDLE CLICKS ON THE "groupsGrid" ---
    async function handleGridClick(event) {
        
        // A. HANDLE "DELETE GROUP" CLICK
        if (event.target.classList.contains('btn-group-delete')) {
            if (!confirm('Are you sure you want to delete this group? This will also delete all comments.')) return;
            const id = event.target.dataset.id;
            try {
                const response = await fetch(`${API_URL}/${id}`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to delete.');
                }
                fetchAndDisplayGroups(); // Refresh
            } catch (error) {
                console.error('Error deleting group:', error);
                alert(`Error: ${error.message}`); 
            }
        }

        // B. HANDLE "POST COMMENT" CLICK
        if (event.target.classList.contains('comment-submit-btn')) {
            event.preventDefault(); 
            if (!token) {
                alert('You must be logged in to post a comment.');
                window.location.href = 'login.html';
                return;
            }
            const commentForm = event.target.closest('.comment-form');
            const input = commentForm.querySelector('input[type="text"]');
            const comment_text = input.value.trim();
            const groupId = commentForm.dataset.groupId;
            if (!comment_text) return; 

            try {
                const response = await fetch(`${API_URL}/${groupId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ comment_text }),
                });
                if (!response.ok) throw new Error('Failed to post comment.');
                input.value = ''; 
                fetchAndDisplayComments(groupId); 
            } catch (error) {
                console.error('Error posting comment:', error);
                alert(error.message);
            }
        }

        // C. HANDLE INTEREST TOGGLE CLICK
        if (event.target.classList.contains('interest-toggle-btn')) {
            if (!token) {
                alert('You must be logged in to mark your interest.');
                window.location.href = 'login.html';
                return;
            }
            const button = event.target;
            const id = button.dataset.id;
            const isInterested = button.dataset.interested === 'true';
            button.disabled = true; 
            const method = isInterested ? 'DELETE' : 'POST'; 
            const endpoint = `${API_URL}/${id}/interest`;
            try {
                const response = await fetch(endpoint, {
                    method: method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Server error');
                const data = await response.json();
                const countSpan = document.getElementById(`interest-count-${id}`);
                countSpan.textContent = `${data.new_count} students are interested`;
                if (isInterested) {
                    button.textContent = "I'm Interested!";
                    button.classList.remove('btn-not-interested');
                    button.classList.add('btn-interest');
                    button.dataset.interested = 'false';
                } else {
                    button.textContent = "Not Interested";
                    button.classList.remove('btn-interest');
                    button.classList.add('btn-not-interested');
                    button.dataset.interested = 'true';
                }
                button.disabled = false;
            } catch (error) {
                console.error('Error toggling interest:', error);
                alert('Failed to toggle interest.');
                button.disabled = false; 
            }
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

    // --- 9. ATTACH EVENT LISTENERS ---
    fetchAndDisplayGroups(); 
    if(form) form.addEventListener('submit', handleGroupFormSubmit);
    if(groupsGrid) groupsGrid.addEventListener('click', handleGridClick);
    if(searchBox) searchBox.addEventListener('input', renderGroups); // <-- NEW

});