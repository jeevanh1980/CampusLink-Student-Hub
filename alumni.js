// alumni.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GET MAIN ELEMENTS ---
    const studentView = document.getElementById('student-view-container');
    const alumniView = document.getElementById('alumni-view-container');
    const loadingView = document.getElementById('loading-container');
    const messagingView = document.getElementById('messaging-view-container');
    
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    const myUserId = parseJwt(token)?.user.id; 

    let allProfiles = []; 
    let allConversations = []; 

    // --- 2. ROLE-BASED ROUTER ---
    function initializeView() {
        if (!token) {
            loadingView.innerHTML = '<h2>Access Denied</h2><p>This feature is available only to logged-in students and alumni. Please <a href="login.html">log in</a>.</p>';
            return;
        }

        // Hide all views first
        studentView.style.display = 'none';
        alumniView.style.display = 'none';
        messagingView.style.display = 'none';
        loadingView.style.display = 'block';

        if (role === 'student') {
            buildStudentView();
            loadingView.style.display = 'none';
            studentView.style.display = 'block';
        } else if (role === 'alumni') {
            buildAlumniView();
            loadingView.style.display = 'none';
            alumniView.style.display = 'block';
        } else {
            loadingView.innerHTML = '<h2>Access Denied</h2><p>This feature is not available for your role.</p>';
        }
        
        // Listen for clicks on "Send Message" buttons (only in student view)
        studentView.addEventListener('click', handleSendMessageClick);
    }
    
    // --- 3. BUILD STUDENT VIEW (NOW HAS 4 TABS) ---
    function buildStudentView() {
        studentView.innerHTML = `
            <h2>Alumni Connect</h2>
            <div class="tab-buttons">
                <button id="tab-directory" class="active">Alumni Directory</button>
                <button id="tab-jobs">Internship & Job Board</button>
                <button id="tab-inbox">My Inbox</button>
                <button id="tab-account">My Account</button> 
            </div>
            
            <div id="tab-content-wrapper">
                <div id="content-directory" class="tab-content active">
                    <h3>Find a Mentor</h3>
                    <div class="filter-bar">
                        <div class="filter-group"><label for="filter-name">Search by Name</label><input type="text" id="filter-name" placeholder="e.g., John Doe"></div>
                        <div class="filter-group"><label for="filter-major">Major</label><input type="text" id="filter-major" placeholder="e.g., Computer Science"></div>
                        </div>
                    <div id="directory-list" class="cards"><p>Loading profiles...</p></div>
                </div>

                <div id="content-jobs" class="tab-content">
                    <h3>Available Opportunities</h3>
                    <div id="job-list" class="cards"><p>Loading opportunities...</p></div>
                </div>
                
                <div id="content-account" class="tab-content">
                    <h3>My Account (Student)</h3>
                    <p>Upload your resume (PDF only). Alumni will see this when you message them.</p>
                    <form id="resume-upload-form" class="form-section active" style="background: none; padding: 0;">
                        <div class="form-group grid-span-2">
                            <label for="resume-file">Upload PDF Resume</label>
                            <input type="file" id="resume-file" name="resume" accept=".pdf" required>
                        </div>
                        <div class="form-group grid-span-2">
                            <button type="submit" class="submit-btn" id="resume-upload-btn">Upload & Save</button>
                            <p id="upload-status" style="margin-top: 10px;"></p>
                        </div>
                    </form>
                    <p>Your current resume: <strong id="current-resume">Loading...</strong></p>
                </div>
            </div>
        `;

        // B. Get tab elements & add logic
        const tabDirectory = document.getElementById('tab-directory');
        const tabJobs = document.getElementById('tab-jobs');
        const tabInbox = document.getElementById('tab-inbox');
        const tabAccount = document.getElementById('tab-account'); 
        
        const contentWrapper = document.getElementById('tab-content-wrapper');
        const contentDirectory = document.getElementById('content-directory');
        const contentJobs = document.getElementById('content-jobs');
        const contentAccount = document.getElementById('content-account'); 
        
        function deactivateAllTabs() {
            tabDirectory.classList.remove('active');
            tabJobs.classList.remove('active');
            tabInbox.classList.remove('active');
            tabAccount.classList.remove('active');
            
            contentDirectory.classList.remove('active');
            contentJobs.classList.remove('active');
            contentAccount.classList.remove('active');
            
            contentWrapper.style.display = 'block'; 
            messagingView.style.display = 'none';
        }

        tabDirectory.addEventListener('click', () => {
            deactivateAllTabs();
            tabDirectory.classList.add('active');
            contentDirectory.classList.add('active');
            localStorage.setItem('activeAlumniTab_student', 'tab-directory'); // Save state
        });
        
        tabJobs.addEventListener('click', () => {
            deactivateAllTabs();
            tabJobs.classList.add('active');
            contentJobs.classList.add('active');
            fetchJobPostings(); 
            localStorage.setItem('activeAlumniTab_student', 'tab-jobs'); // Save state
        });

        tabInbox.addEventListener('click', () => {
            deactivateAllTabs();
            tabInbox.classList.add('active');
            contentWrapper.style.display = 'none'; 
            messagingView.style.display = 'block'; 
            showInbox(); 
            localStorage.setItem('activeAlumniTab_student', 'tab-inbox'); // Save state
        });
        
        tabAccount.addEventListener('click', () => { 
            deactivateAllTabs();
            tabAccount.classList.add('active');
            contentAccount.classList.add('active');
            fetchCurrentResume(); 
            localStorage.setItem('activeAlumniTab_student', 'tab-account'); // Save state
        });
        
        // C. Add filter listeners
        document.getElementById('filter-name').addEventListener('input', renderFilteredProfiles);
        document.getElementById('filter-major').addEventListener('input', renderFilteredProfiles);
        // "Industry" listener removed
        
        // D. Add resume form listener
        document.getElementById('resume-upload-form').addEventListener('submit', handleResumeUpload);

        // E. Initial data fetch
        fetchAlumniProfiles();
        
        // F. Activate correct tab from memory
        let lastActiveTab = localStorage.getItem('activeAlumniTab_student') || 'tab-directory';
        const activeTabButton = document.getElementById(lastActiveTab);
        if (activeTabButton) {
            activeTabButton.click(); 
        } else {
            tabDirectory.click();
        }
    }

    // --- 4. BUILD ALUMNI VIEW (WITH MEMORY) ---
    function buildAlumniView() {
        let lastActiveTab = localStorage.getItem('activeAlumniTab_alumni') || 'tab-profile';

        alumniView.innerHTML = `
            <h2>My Dashboard</h2>
            <div class="tab-buttons">
                <button id="tab-profile">My Profile</button>
                <button id="tab-postings">My Postings</button>
                <button id="tab-inbox">My Inbox</button>
            </div>
            <div id="tab-content-wrapper">
                <div id="content-profile" class="tab-content">
                    <div class="dashboard-section">
                        <h2>My Mentor Profile</h2>
                        <p>This profile is visible to students. Keep it updated!</p>
                        <form id="profile-form" class="form-section active">
                            <p id="profile-loading-msg">Loading your profile...</p>
                        </form>
                    </div>
                </div>
                <div id="content-postings" class="tab-content">
                    <div class="dashboard-section">
                        <h2>My Internship Postings</h2>
                        <p>Post opportunities for students at your company.</p>
                        <h3>Post a New Opportunity</h3>
                        <form id="job-post-form" class="form-section active">
                             <div class="form-group grid-span-2"><label for="job-title">Job Title</label><input type="text" id="job-title" name="job_title" required></div>
                             <div class="form-group grid-span-2"><label for="job-company">Company</label><input type="text" id="job-company" name="company" required></div>
                             <div class="form-group grid-span-2"><label for="job-link">Application Link</label><input type="url" id="job-link" name="application_link" placeholder="https://" required></div>
                             <div class="form-group grid-span-2"><label for="job-desc">Description</label><textarea id="job-desc" name="description" required></textarea></div>
                             <div class="form-group grid-span-2"><button type="submit" class="submit-btn">Post Opportunity</button><p id="job-post-status"></p></div>
                        </form>
                        <h3>My Active Postings</h3>
                        <div id="my-postings-list" class="cards"><p>Loading your postings...</p></div>
                    </div>
                </div>
            </div>
        `;
        
        const tabProfile = document.getElementById('tab-profile');
        const tabPostings = document.getElementById('tab-postings');
        const tabInbox = document.getElementById('tab-inbox');
        const contentWrapper = document.getElementById('tab-content-wrapper');
        const contentProfile = document.getElementById('content-profile');
        const contentPostings = document.getElementById('content-postings');
        
        function deactivateAllTabs() {
            tabProfile.classList.remove('active');
            tabPostings.classList.remove('active');
            tabInbox.classList.remove('active');
            contentProfile.classList.remove('active');
            contentPostings.classList.remove('active');
            contentWrapper.style.display = 'block';
            messagingView.style.display = 'none';
        }
        
        tabProfile.addEventListener('click', () => {
            deactivateAllTabs();
            tabProfile.classList.add('active');
            contentProfile.classList.add('active');
            localStorage.setItem('activeAlumniTab_alumni', 'tab-profile'); // Save state
        });
        
        tabPostings.addEventListener('click', () => {
            deactivateAllTabs();
            tabPostings.classList.add('active');
            contentPostings.classList.add('active');
            localStorage.setItem('activeAlumniTab_alumni', 'tab-postings'); // Save state
        });
        
        tabInbox.addEventListener('click', () => {
            deactivateAllTabs();
            tabInbox.classList.add('active');
            contentWrapper.style.display = 'none';
            messagingView.style.display = 'block';
            showInbox();
            localStorage.setItem('activeAlumniTab_alumni', 'tab-inbox'); // Save state
        });
        
        const activeTabButton = document.getElementById(lastActiveTab);
        if (activeTabButton) {
            activeTabButton.click(); 
        } else {
            tabProfile.click(); // Fallback
        }

        fetchAndBuildProfileForm();
        document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
        document.getElementById('job-post-form').addEventListener('submit', handleJobPostSubmit);
        fetchMyPostings();
        document.getElementById('my-postings-list').addEventListener('click', handleDeletePosting);
    }

    // --- 5. STUDENT VIEW HELPERS ---
    async function fetchAlumniProfiles() {
        try {
            const response = await fetch('http://localhost:3001/api/alumni/profiles', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch profiles.');
            allProfiles = await response.json();
            renderFilteredProfiles(); 
        } catch (error) {
            document.getElementById('directory-list').innerHTML = `<p>${error.message} Please log in.</p>`;
        }
    }
    
    // --- UPDATED: Removed Industry filter logic ---
    function renderFilteredProfiles() {
        const directoryList = document.getElementById('directory-list');
        const nameInput = document.getElementById('filter-name');
        const majorInput = document.getElementById('filter-major');
        
        const nameQuery = nameInput ? nameInput.value.toLowerCase() : '';
        const majorQuery = majorInput ? majorInput.value.toLowerCase() : '';

        const filteredProfiles = allProfiles.filter(profile => {
            const name = profile.full_name || '';
            const major = profile.major || '';
            
            return name.toLowerCase().includes(nameQuery) &&
                   major.toLowerCase().includes(majorQuery);
        });

        directoryList.innerHTML = ''; 
        if (filteredProfiles.length === 0) {
            directoryList.innerHTML = '<p>No profiles match your criteria.</p>';
            return;
        }
        filteredProfiles.forEach(profile => {
            directoryList.appendChild(createProfileCard(profile));
        });
    }

    // --- UPDATED: Removed Industry from card ---
    function createProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'profile-card';
        let tagsHtml = '<div class="help-tags">';
        if (profile.can_help_mentorship) tagsHtml += `<span>Mentorship</span>`;
        if (profile.can_help_resume) tagsHtml += `<span>Resume Reviews</span>`;
        if (profile.can_help_internship) tagsHtml += `<span>Internship Help</span>`;
        tagsHtml += '</div>';
        card.innerHTML = `
            <h3>${profile.full_name}</h3>
            <p class="job-title">${profile.current_job || 'N/A'} at ${profile.company || 'N/A'}</p>
            <p><strong>Major:</strong> ${profile.major || 'N/A'} (Graduated ${profile.graduation_year || 'N/A'})</p>
            ${tagsHtml}
            <a href="${profile.linkedin_url || '#'}" class="btn-contact">LinkedIn</a>
            <button class="btn-send-message" data-alumni-id="${profile.user_id}" data-alumni-name="${profile.full_name}" style="margin-left: 10px;">
                Send Message
            </button>
        `;
        return card;
    }
    async function fetchJobPostings() {
        const jobList = document.getElementById('job-list');
        if (!jobList) return; 
        if (jobList.dataset.loaded) return; 
        jobList.innerHTML = '<p>Loading opportunities...</p>';
        try {
            const response = await fetch('http://localhost:3001/api/internships', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch postings.');
            const postings = await response.json();
            jobList.innerHTML = ''; 
            jobList.dataset.loaded = 'true'; 
            if (postings.length === 0) {
                jobList.innerHTML = '<p>No opportunities posted at this time.</p>';
                return;
            }
            postings.forEach(post => {
                const card = document.createElement('div');
                card.className = 'job-card';
                card.innerHTML = `
                    <h3>${post.job_title}</h3>
                    <p><strong>Company:</strong> ${post.company}</p>
                    <p><strong>Posted by:</strong> ${post.posted_by}</p>
                    <p>${post.description.substring(0, 150)}...</p>
                    <a href="${post.application_link}" class="btn-contact">Apply Now</a>
                `;
                jobList.appendChild(card);
            });
        } catch (error) {
            jobList.innerHTML = `<p>${error.message} Please log in.</p>`;
        }
    }

    // --- 6. ALUMNI VIEW HELPERS ---
    
    // --- UPDATED: Removed 'industry' from form ---
    async function fetchAndBuildProfileForm() {
        const profileForm = document.getElementById('profile-form');
        if (!profileForm) return; 
        try {
            const response = await fetch('http://localhost:3001/api/alumni/my-profile', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch profile');
            const profile = await response.json(); 
            profileForm.innerHTML = `
                <div class="form-group"><label for="full_name">Full Name</label><input type="text" id="full_name" name="full_name" value="${profile?.full_name || ''}" required></div>
                <div class="form-group"><label for="graduation_year">Graduation Year</label><input type="number" id="graduation_year" name="graduation_year" value="${profile?.graduation_year || ''}"></div>
                <div class.form-group"><label for="major">Major</label><input type="text" id="major" name="major" value="${profile?.major || ''}"></div>
                <div class="form-group"><label for="current_job">Current Job Title</label><input type="text" id="current_job" name="current_job" value="${profile?.current_job || ''}"></div>
                <div class.form-group"><label for="company">Company</label><input type="text" id="company" name="company" value="${profile?.company || ''}"></div>
                <div class="form-group grid-span-2"><label for="linkedin_url">LinkedIn Profile URL</label><input type="url" id="linkedin_url" name="linkedin_url" value="${profile?.linkedin_url || ''}"></div>
                <div class="form-group grid-span-2"><label>I can help with:</label>
                    <div class="checkbox-group">
                        <div class="checkbox-item"><input type="checkbox" id="can_help_mentorship" name="can_help_mentorship" ${profile?.can_help_mentorship ? 'checked' : ''}><label for="can_help_mentorship">Mentorship & Career Advice</label></div>
                        <div class="checkbox-item"><input type="checkbox" id="can_help_resume" name="can_help_resume" ${profile?.can_help_resume ? 'checked' : ''}><label for="can_help_resume">Resume Reviews</label></div>
                        <div class="checkbox-item"><input type="checkbox" id="can_help_internship" name="can_help_internship" ${profile?.can_help_internship ? 'checked' : ''}><label for="can_help_internship">Internship/Job Opportunities</label></div>
                    </div>
                </div>
                <div class="form-group grid-span-2"><button type="submit" class="submit-btn">Save Profile</button><p id="profile-save-status"></p></div>
            `;
        } catch (error) {
            profileForm.innerHTML = `<p>${error.message}. Please reload.</p>`;
        }
    }
    
    // --- UPDATED: Removed 'industry' from save logic ---
    async function handleProfileSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const statusEl = document.getElementById('profile-save-status');
        statusEl.textContent = 'Saving...';
        try {
            const formData = new FormData(form);
            const data = {
                full_name: formData.get('full_name'),
                graduation_year: formData.get('graduation_year') || null,
                major: formData.get('major'),
                current_job: formData.get('current_job'),
                company: formData.get('company'),
                // industry removed
                linkedin_url: formData.get('linkedin_url'),
                can_help_mentorship: formData.get('can_help_mentorship') === 'on',
                can_help_resume: formData.get('can_help_resume') === 'on',
                can_help_internship: formData.get('can_help_internship') === 'on'
            };
            const response = await fetch('http://localhost:3001/api/alumni/my-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to save profile');
            statusEl.textContent = 'Profile saved successfully!';
            statusEl.style.color = 'green';
        } catch (error) {
            statusEl.textContent = error.message;
            statusEl.style.color = 'red';
        }
    }
    async function handleJobPostSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const statusEl = document.getElementById('job-post-status');
        statusEl.textContent = 'Posting...';
        try {
            const formData = new FormData(form);
            const data = {
                job_title: formData.get('job_title'),
                company: formData.get('company'),
                application_link: formData.get('application_link'),
                description: formData.get('description')
            };
            const response = await fetch('http://localhost:3001/api/internships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create post.');
            statusEl.textContent = 'Posted successfully!';
            statusEl.style.color = 'green';
            form.reset();
            fetchMyPostings(); 
        } catch (error) {
            statusEl.textContent = error.message;
            statusEl.style.color = 'red';
        }
    }
    async function fetchMyPostings() {
        const listEl = document.getElementById('my-postings-list');
        if (!listEl) return; 
        listEl.innerHTML = '<p>Loading your postings...</p>';
        try {
            const response = await fetch('http://localhost:3001/api/internships/my-postings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch postings.');
            const postings = await response.json();
            listEl.innerHTML = ''; 
            if (postings.length === 0) {
                listEl.innerHTML = '<p>You have not posted any opportunities yet.</p>';
                return;
            }
            postings.forEach(post => {
                const card = document.createElement('div');
                card.className = 'card'; 
                card.innerHTML = `
                    <button class="btn-delete-posting" data-id="${post.id}">&times; Delete</button>
                    <h3>${post.job_title}</h3>
                    <p><strong>Company:</strong> ${post.company}</p>
                    <p style="margin-top: 8px; font-size: 0.9em;">${post.description.substring(0, 100)}...</p> 
                    <a href="${post.application_link}" class="btn-contact" target="_blank" style="margin-top: 10px;">View Listing</a>
                `;
                listEl.appendChild(card);
            });
        } catch (error) {
            listEl.innerHTML = `<p>${error.message}</p>`;
        }
    }
    async function handleDeletePosting(event) {
        if (!event.target.classList.contains('btn-delete-posting')) return;
        if (!confirm('Are you sure you want to delete this posting?')) return;
        const postId = event.target.dataset.id;
        try {
            const response = await fetch(`http://localhost:3001/api/internships/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete.');
            fetchMyPostings(); 
        } catch (error) {
            alert(error.message);
        }
    }

    // --- 7. MESSAGING & ACCOUNT FUNCTIONS ---
    
    function showMessagingView() {
        const contentWrapper = document.getElementById('tab-content-wrapper');
        if (contentWrapper) contentWrapper.style.display = 'none';
        messagingView.style.display = 'block';
    }

    async function handleSendMessageClick(event) {
        if (event.target.classList.contains('btn-send-message')) {
            const recipientId = event.target.dataset.alumniId;
            const button = event.target;
            
            button.disabled = true;
            button.textContent = 'Loading...';

            try {
                const response = await fetch('http://localhost:3001/api/messages/find-or-create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ recipient_user_id: recipientId })
                });
                if (!response.ok) throw new Error('Could not start conversation');
                const { conversationId } = await response.json();

                document.getElementById('tab-directory')?.classList.remove('active');
                document.getElementById('tab-inbox')?.classList.add('active');
                
                showMessagingView();
                buildConversationView(conversationId);

            } catch (error) {
                alert(error.message);
            } finally {
                // Reset button state
                button.disabled = false;
                button.textContent = 'Send Message';
            }
        }
    }

    async function showInbox() {
        showMessagingView();
        messagingView.innerHTML = '<h2>My Inbox</h2><p>Loading conversations...</p>';

        try {
            const response = await fetch('http://localhost:3001/api/messages/inbox', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not load inbox.');
            allConversations = await response.json(); 
            
            let html = '<h2>My Inbox</h2>'; 
            
            if (allConversations.length === 0) {
                html += '<p>You have no messages.</p>';
            } else {
                html += '<div class="cards">'; 
                allConversations.forEach(convo => {
                    html += `
                        <div class="card" style="cursor: pointer;" data-convo-id="${convo.id}">
                            <h3>With: ${convo.other_user_display_name}</h3>
                            <p><i>Last message: ${new Date(convo.last_message_time || convo.createdAt).toLocaleString()}</i></p>
                        </div>
                    `;
                });
                html += '</div>';
            }
            messagingView.innerHTML = html;
            
            messagingView.addEventListener('click', (e) => {
                const card = e.target.closest('.card[data-convo-id]');
                if (card) {
                    const convoId = card.dataset.convoId;
                    buildConversationView(convoId);
                }
            });

        } catch (error) {
            messagingView.innerHTML = `<h2>My Inbox</h2><p>${error.message}</p>`;
        }
    }

    async function buildConversationView(conversationId) {
        showMessagingView();
        messagingView.innerHTML = `<h2>Loading Conversation...</h2>`;
        
        try {
            const response = await fetch(`http://localhost:3001/api/messages/conversation/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not load conversation.');
            const { conversation, messages } = await response.json();

            let otherUserName = 'User';
            if (allConversations.length > 0) {
                const convoData = allConversations.find(c => c.id == conversationId); 
                if (convoData) {
                    otherUserName = convoData.other_user_display_name;
                }
            }
            if (otherUserName === 'User') {
                 const otherMessage = messages.find(m => m.sender_id !== myUserId);
                 if (otherMessage) {
                    otherUserName = otherMessage.sender_email;
                 }
            }

            let messagesHtml = '<div class="comments-list" style="max-height: 400px;">'; 
            messages.forEach(msg => {
                const isMe = msg.sender_id === myUserId;
                
                let resumeLink = '';
                if (!isMe && msg.sender_resume_url) {
                    resumeLink = ` <a href="http://localhost:3001${msg.sender_resume_url}" 
                                      target="_blank" 
                                      style="font-size: 0.9em; font-weight: bold;">
                                      (View Resume)
                                   </a>`;
                }

                messagesHtml += `
                    <div class="comment-item" style="background: ${isMe ? '#f0f4f8' : 'white'}; padding: 10px; border-radius: 5px;">
                        <strong>${isMe ? 'Me' : msg.sender_email}:</strong>
                        ${resumeLink}
                        <p style="margin-top: 5px;">${msg.message_text}</p>
                        <i style="font-size: 0.8em; color: #777; display: block; text-align: right; margin-top: 5px;">${new Date(msg.createdAt).toLocaleString()}</i>
                    </div>
                `;
            });
            if(messages.length === 0) {
                messagesHtml += '<p>No messages yet. Say hello!</p>';
            }
            messagesHtml += '</div>';

            messagingView.innerHTML = `
                <h2>Conversation with ${otherUserName}</h2>
                ${messagesHtml}
                <form id="reply-form" class="form-section active" data-convo-id="${conversationId}" style="background: none; padding: 0; margin-top: 20px;">
                    <div class="form-group grid-span-2">
                        <label for="reply-text">Your Reply</label>
                        <textarea id="reply-text" name="message" rows="3" required></textarea>
                    </div>
                    <div class="form-group grid-span-2">
                        <button type="submit" class="submit-btn">Send Reply</button>
                        <p id="reply-status"></p>
                    </div>
                </form>
            `;
            
            document.getElementById('reply-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusEl = document.getElementById('reply-status');
                statusEl.textContent = 'Sending...';
                const data = { message_text: e.target.message.value };
                try {
                    const response = await fetch(`http://localhost:3001/api/messages/reply/${conversationId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) throw new Error('Failed to send reply.');
                    e.target.reset();
                    buildConversationView(conversationId); // Refresh the view
                } catch (error) {
                    statusEl.textContent = error.message;
                    statusEl.style.color = 'red';
                }
            });
        } catch (error) {
            messagingView.innerHTML = `<h2>Error</h2><p>${error.message}</p>`;
        }
    }

    // --- STUDENT ACCOUNT FUNCTIONS ---
    async function fetchCurrentResume() {
        const currentResumeEl = document.getElementById('current-resume');
        if (!currentResumeEl) return;
        
        try {
            const response = await fetch('http://localhost:3001/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await response.json();
            
            if (user.resume_url) {
                currentResumeEl.innerHTML = `<a href="http://localhost:3001${user.resume_url}" target="_blank">View Current Resume</a>`;
            } else {
                currentResumeEl.textContent = 'No resume on file.';
            }
        } catch (error) {
            currentResumeEl.textContent = 'Could not load resume info.';
        }
    }

    async function handleResumeUpload(event) {
        event.preventDefault();
        const uploadForm = event.target;
        const uploadStatus = document.getElementById('upload-status');
        const currentResumeEl = document.getElementById('current-resume');
        
        uploadStatus.textContent = 'Uploading...';
        
        const formData = new FormData(uploadForm);
        
        try {
            const response = await fetch('http://localhost:3001/api/account/upload-resume', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Upload failed');

            uploadStatus.textContent = 'Upload successful!';
            uploadStatus.style.color = 'green';
            currentResumeEl.innerHTML = `<a href="http://localhost:3001${data.resume_url}" target="_blank">View Current Resume</a>`;
            uploadForm.reset();

        } catch (error) {
            uploadStatus.textContent = error.message;
            uploadStatus.style.color = 'red';
        }
    }


    // --- 8. UTILITY FUNCTIONS ---
    function parseJwt (token) {
        if (!token) { return null; }
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    // --- 9. INITIALIZE THE PAGE ---
    initializeView();
});