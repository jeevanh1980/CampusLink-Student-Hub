// server.js (Full Name REMOVED)

// --- 1. IMPORT PACKAGES ---
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth'); 

// --- 2. INITIALIZE APP ---
const app = express();
const PORT = 3001;

// --- 3. CONFIG & MIDDLEWARE ---
app.use(cors());
app.use(express.json()); 
app.use('/uploads', express.static('uploads')); 

// --- !! IMPORTANT: JWT SECRET ---
const JWT_SECRET = "your_super_secret_key_that_no_one_knows"; 

// --- 4. MULTER CONFIG ---
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/images/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadImage = multer({ storage: imageStorage });

const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/resumes/'),
    filename: (req, file, cb) => cb(null, `${req.user.id}_${Date.now()}_resume.pdf`)
});
const uploadResume = multer({ 
    storage: resumeStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only .pdf files are allowed!'), false);
        }
    }
});

// --- 5. MYSQL DATABASE CONNECTION ---
let db;
async function connectToDatabase() {
    try {
        db = await mysql.createPool({
            host: 'localhost',
            user: 'root',      // <-- Make sure this is your correct user
            password: 'Jeevan#123', // <-- Make sure this is your correct password
            database: 'campuslink_db'
        });

        if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
        if (!fs.existsSync('./uploads/images')) fs.mkdirSync('./uploads/images');
        if (!fs.existsSync('./uploads/resumes')) fs.mkdirSync('./uploads/resumes');

        await db.query('SELECT 1');
        console.log('✅ Connected to MySQL database!');
    } catch (error) {
        console.error('❌ Error connecting to MySQL:', error);
        process.exit(1);
    }
}

// --- 6. API ROUTES ---

// === AUTHENTICATION API ===
app.post('/api/auth/register', async (req, res) => {
    try {
        // --- FIX: Removed full_name ---
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const isAllowedDomain = email.endsWith('@gmail.com') || email.endsWith('@acharya.ac.in') || email.endsWith('@yahoo.com');
        if (!isAllowedDomain) {
            return res.status(400).json({ message: 'Registration is not allowed with this email domain.' });
        }
        if (!['student', 'alumni', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // --- FIX: Removed full_name ---
        const sql = "INSERT INTO users (email, password, role) VALUES (?, ?, ?)";
        await db.query(sql, [email, hashedPassword, role]);
        console.log(`New user registered: ${email}, Role: ${role}`);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already exists.' });
        }
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const isAllowedDomain = email.endsWith('@gmail.com') || email.endsWith('@acharya.ac.in') || email.endsWith('@yahoo.com');
        if (!isAllowedDomain) {
            return res.status(400).json({ message: 'Invalid email address.' });
        }
        const sql = "SELECT * FROM users WHERE email = ?";
        const [rows] = await db.query(sql, [email]);
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '3h' });
        console.log(`User logged in: ${user.email}, Role: ${user.role}`);
        // --- FIX: Removed full_name (it doesn't exist) ---
        res.json({ token, role: user.role, message: 'Login successful!' });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

app.get('/api/auth/me', auth, async (req, res) => {
    try {
        const sql = "SELECT id, email, role, resume_url FROM users WHERE id = ?";
        const [rows] = await db.query(sql, [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// === ACCOUNT API (for Resume Upload) ===
app.post('/api/account/upload-resume', auth, (req, res) => {
    uploadResume.single('resume')(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded.' });
            }
            const resumeUrl = `/uploads/resumes/${req.file.filename}`;
            const userId = req.user.id;
            const sql = "UPDATE users SET resume_url = ? WHERE id = ?";
            await db.query(sql, [resumeUrl, userId]);
            res.json({ message: 'Resume uploaded successfully', resume_url: resumeUrl });
        } catch (error) {
            console.error('Error uploading resume:', error);
            res.status(500).json({ message: error.message || 'Server error uploading file' });
        }
    });
});

// === LOST & FOUND API ===
app.post('/api/lost-and-found', auth, (req, res) => {
    uploadImage.single('image')(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            let imagePath = null;
            if (req.file) {
                imagePath = `/uploads/images/${req.file.filename}`;
            }
            const { type, title, description, location, contact } = req.body;
            const userId = req.user.id; 
            const sql = `INSERT INTO lost_and_found (type, title, description, location, contact, imagePath, user_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const [result] = await db.query(sql, [type, title, description, location, contact, imagePath, userId]);
            const [newPost] = await db.query('SELECT * FROM lost_and_found WHERE id = ?', [result.insertId]);
            res.status(201).json(newPost[0]);
        } catch (error) {
            console.error('Error posting new item:', error);
            res.status(500).json({ message: 'Error posting new item' });
        }
    });
});
app.get('/api/lost-and-found', async (req, res) => {
    try {
        const sql = "SELECT * FROM lost_and_found WHERE status = 'active' ORDER BY createdAt DESC";
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Error fetching posts' });
    }
});
app.put('/api/lost-and-found/claim/:id', auth, async (req, res) => {
    const idToClaim = parseInt(req.params.id);
    const userId = req.user.id;
    try {
        const checkSql = "SELECT user_id FROM lost_and_found WHERE id = ?";
        const [rows] = await db.query(checkSql, [idToClaim]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        if (rows[0].user_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to modify this post.' });
        }
        const sql = "UPDATE lost_and_found SET status = 'claimed' WHERE id = ?";
        await db.query(sql, [idToClaim]);
        console.log(`Updated status to 'claimed' for id: ${idToClaim}`);
        res.status(200).json({ message: 'Post marked as claimed' });
    } catch (error) {
        console.error('Error claiming item:', error);
        res.status(500).json({ message: 'Error claiming item' });
    }
});

// === STUDY HUB API ===
app.get('/api/study-groups', auth, async (req, res) => {
    try {
        const userId = req.user.id; 
        const sql = `
            SELECT 
                g.*, 
                COUNT(DISTINCT i.user_id) AS interest_count,
                MAX(CASE WHEN i.user_id = ? THEN 1 ELSE 0 END) AS is_interested
            FROM study_groups g
            LEFT JOIN study_group_interest i ON g.id = i.group_id
            GROUP BY g.id
            ORDER BY g.createdAt DESC
        `;
        const [rows] = await db.query(sql, [userId]);
        const groups = rows.map(group => ({
            ...group,
            is_interested: group.is_interested === 1
        }));
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Error fetching groups' });
    }
});
app.post('/api/study-groups', auth, async (req, res) => {
    const { subject, location, description } = req.body;
    const userId = req.user.id; 
    const sql = `INSERT INTO study_groups (subject, location, description, user_id) VALUES (?, ?, ?, ?)`; 
    try {
        const [result] = await db.query(sql, [subject, location, description, userId]); 
        const [newGroup] = await db.query('SELECT * FROM study_groups WHERE id = ?', [result.insertId]);
        console.log('New study group created:', newGroup[0]);
        res.status(201).json(newGroup[0]);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Error creating group' });
    }
});
app.delete('/api/study-groups/:id', auth, async (req, res) => {
    const idToDelete = parseInt(req.params.id);
    const userId = req.user.id; 
    try {
        const checkSql = "SELECT user_id FROM study_groups WHERE id = ?";
        const [rows] = await db.query(checkSql, [idToDelete]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Group not found.' });
        }
        if (rows[0].user_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this group.' });
        }
        await db.query('DELETE FROM study_groups WHERE id = ?', [idToDelete]);
        console.log(`Deleted group with id: ${idToDelete}`);
        res.status(200).json({ message: 'Group deleted' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ message: 'Error deleting group' });
    }
});
app.get('/api/study-groups/:id/comments', async (req, res) => {
    try {
        const groupId = req.params.id;
        const sql = "SELECT * FROM study_group_comments WHERE group_id = ? ORDER BY createdAt ASC";
        const [comments] = await db.query(sql, [groupId]);
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});
app.post('/api/study-groups/:id/comments', auth, async (req, res) => {
    try {
        const groupId = req.params.id;
        const { comment_text } = req.body;
        const userId = req.user.id; 
        const [userRows] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
        const userEmail = userRows[0].email;
        if (!comment_text) {
             return res.status(400).json({ message: 'Comment text is required.' });
        }
        const sql = `INSERT INTO study_group_comments 
                        (group_id, user_id, user_email, comment_text) 
                     VALUES (?, ?, ?, ?)`;
        await db.query(sql, [groupId, userId, userEmail, comment_text]);
        const [newComment] = await db.query("SELECT * FROM study_group_comments WHERE id = LAST_INSERT_ID()");
        res.status(201).json(newComment[0]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
});
app.post('/api/study-groups/:id/interest', auth, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id; 
        const insertSql = "INSERT IGNORE INTO study_group_interest (group_id, user_id) VALUES (?, ?)";
        await db.query(insertSql, [groupId, userId]);
        const countSql = "SELECT COUNT(*) AS count FROM study_group_interest WHERE group_id = ?";
        const [countRows] = await db.query(countSql, [groupId]);
        res.status(200).json({ new_count: countRows[0].count });
    } catch (error) {
        console.error('Error marking interest:', error);
        res.status(500).json({ message: 'Error marking interest' });
    }
});
app.delete('/api/study-groups/:id/interest', auth, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const deleteSql = "DELETE FROM study_group_interest WHERE group_id = ? AND user_id = ?";
        await db.query(deleteSql, [groupId, userId]);
        const countSql = "SELECT COUNT(*) AS count FROM study_group_interest WHERE group_id = ?";
        const [countRows] = await db.query(countSql, [groupId]);
        res.status(200).json({ new_count: countRows[0].count });
    } catch (error) {
        console.error('Error removing interest:', error);
        res.status(500).json({ message: 'Error removing interest' });
    }
});

// === STUDEX (MATERIALS EXCHANGE) API ===
app.post('/api/studex', auth, (req, res) => {
    uploadImage.single('image')(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            let imagePath = null;
            if (req.file) {
                imagePath = `/uploads/images/${req.file.filename}`;
            }
            const { title, author, description, contact } = req.body;
            const userId = req.user.id; 
            const sql = `INSERT INTO studex_items (title, author, contact, description, imagePath, user_id) 
                         VALUES (?, ?, ?, ?, ?, ?)`;
            const [result] = await db.query(sql, [title, author, contact, description, imagePath, userId]);
            const [newPost] = await db.query('SELECT * FROM studex_items WHERE id = ?', [result.insertId]);
            res.status(201).json(newPost[0]);
        } catch (error) {
            console.error('Error posting new item:', error);
            res.status(500).json({ message: 'Error posting new item' });
        }
    });
});
app.get('/api/studex', async (req, res) => {
    try {
        const sql = "SELECT * FROM studex_items ORDER BY createdAt DESC";
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'Error fetching items' });
    }
});
app.delete('/api/studex/:id', auth, async (req, res) => {
    const idToDelete = parseInt(req.params.id);
    const userId = req.user.id;
    try {
        const checkSql = "SELECT user_id FROM studex_items WHERE id = ?";
        const [rows] = await db.query(checkSql, [idToDelete]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        if (rows[0].user_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this post.' });
        }
        const sql = "DELETE FROM studex_items WHERE id = ?";
        await db.query(sql, [idToDelete]);
        res.status(200).json({ message: 'Post deleted' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Error deleting item' });
    }
});

// === ALUMNI CONNECT API ===
app.get('/api/alumni/profiles', auth, async (req, res) => {
    try {
        const sql = `SELECT 
                        user_id, full_name, graduation_year, major, 
                        current_job, company, linkedin_url,
                        can_help_mentorship, can_help_resume, can_help_internship
                     FROM alumni_profiles
                     ORDER BY full_name ASC`;
        const [profiles] = await db.query(sql);
        res.json(profiles);
    } catch (error) {
        console.error('Error fetching alumni profiles:', error);
        res.status(500).json({ message: 'Error fetching profiles' });
    }
});
app.get('/api/alumni/my-profile', auth, async (req, res) => {
    try {
        const sql = "SELECT * FROM alumni_profiles WHERE user_id = ?";
        const [rows] = await db.query(sql, [req.user.id]);
        if (rows.length > 0) {
            res.json(rows[0]); 
        } else {
            res.json(null); 
        }
    } catch (error) {
        console.error('Error fetching my-profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});
app.post('/api/alumni/my-profile', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        // --- FIX: Removed 'industry' ---
        const {
            full_name, graduation_year, major, current_job, company,
            linkedin_url, can_help_mentorship,
            can_help_resume, can_help_internship
        } = req.body;
        const sql = `
            INSERT INTO alumni_profiles (
                user_id, full_name, graduation_year, major, current_job, company,
                linkedin_url, can_help_mentorship, can_help_resume, can_help_internship
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                graduation_year = VALUES(graduation_year),
                major = VALUES(major),
                current_job = VALUES(current_job),
                company = VALUES(company),
                linkedin_url = VALUES(linkedin_url),
                can_help_mentorship = VALUES(can_help_mentorship),
                can_help_resume = VALUES(can_help_resume),
                can_help_internship = VALUES(can_help_internship)
        `;
        await db.query(sql, [
            userId, full_name, graduation_year, major, current_job, company,
            linkedin_url,
            can_help_mentorship || false, 
            can_help_resume || false,
            can_help_internship || false
        ]);
        res.status(200).json({ message: 'Profile saved successfully' });
    } catch (error) {
        console.error('Error saving profile:', error);
        res.status(500).json({ message: 'Error saving profile' });
    }
});
app.get('/api/internships', auth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id, p.job_title, p.company, p.description, p.application_link, p.createdAt,
                a.full_name as posted_by
            FROM internship_postings p
            JOIN alumni_profiles a ON p.user_id = a.user_id
            ORDER BY p.createdAt DESC
        `;
        const [postings] = await db.query(sql);
        res.json(postings);
    } catch (error) {
        console.error('Error fetching internships:', error);
        res.status(500).json({ message: 'Error fetching internships' });
    }
});
app.get('/api/internships/my-postings', auth, async (req, res) => {
    try {
        const sql = "SELECT * FROM internship_postings WHERE user_id = ? ORDER BY createdAt DESC";
        const [postings] = await db.query(sql, [req.user.id]);
        res.json(postings);
    } catch (error) {
        console.error('Error fetching my postings:', error);
        res.status(500).json({ message: 'Error fetching my postings' });
    }
});
app.post('/api/internships', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_title, company, description, application_link } = req.body;
        if (!job_title || !company || !description || !application_link) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const sql = `
            INSERT INTO internship_postings (user_id, job_title, company, description, application_link)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.query(sql, [userId, job_title, company, description, application_link]);
        res.status(201).json({ message: 'Posting created successfully' });
    } catch (error) {
        console.error('Error creating posting:', error);
        res.status(500).json({ message: 'Error creating posting' });
    }
});
app.delete('/api/internships/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const sql = "DELETE FROM internship_postings WHERE id = ? AND user_id = ?";
        const [result] = await db.query(sql, [postId, userId]);
        if (result.affectedRows === 0) {
            return res.status(403).json({ message: 'Error: You do not have permission to delete this post or it does not exist.' });
        }
        res.status(200).json({ message: 'Posting deleted successfully' });
    } catch (error) {
        console.error('Error deleting posting:', error);
        res.status(500).json({ message: 'Error deleting posting' });
    }
});

// === MESSAGING API ===
app.get('/api/messages/inbox', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const sql = `
            SELECT 
                c.id, 
                COALESCE(MAX(m.createdAt), c.createdAt) AS last_message_time,
                CASE
                    WHEN c.started_by_user_id = ? 
                    THEN (
                        SELECT COALESCE(ap.full_name, u.email) 
                        FROM users u
                        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
                        WHERE u.id = c.recipient_user_id
                    )
                    ELSE (
                        SELECT COALESCE(ap.full_name, u.email) 
                        FROM users u
                        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
                        WHERE u.id = c.started_by_user_id
                    )
                END AS other_user_display_name
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id 
            WHERE c.started_by_user_id = ? OR c.recipient_user_id = ?
            GROUP BY c.id 
            ORDER BY last_message_time DESC; 
        `;
        const [conversations] = await db.query(sql, [userId, userId, userId]);
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching inbox:', error);
        res.status(500).json({ message: 'Error fetching inbox' });
    }
});
app.get('/api/messages/conversation/:id', auth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        const [convoCheck] = await db.query(
            "SELECT * FROM conversations WHERE id = ? AND (started_by_user_id = ? OR recipient_user_id = ?)",
            [conversationId, userId, userId]
        );
        if (convoCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const sql = `
            SELECT m.id, m.message_text, m.createdAt, m.sender_id, 
                   u.email as sender_email, u.resume_url as sender_resume_url
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.createdAt ASC
        `;
        const [messages] = await db.query(sql, [conversationId]);
        res.json({ conversation: convoCheck[0], messages });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ message: 'Error fetching conversation' });
    }
});
app.post('/api/messages/find-or-create', auth, async (req, res) => {
    try {
        const myUserId = req.user.id;
        const { recipient_user_id } = req.body;
        if (!recipient_user_id) {
            return res.status(400).json({ message: 'Recipient is required.' });
        }
        const findSql = `
            SELECT id FROM conversations
            WHERE (started_by_user_id = ? AND recipient_user_id = ?)
               OR (started_by_user_id = ? AND recipient_user_id = ?)
        `;
        const [existing] = await db.query(findSql, [myUserId, recipient_user_id, recipient_user_id, myUserId]);
        if (existing.length > 0) {
            res.json({ conversationId: existing[0].id });
        } else {
            const createSql = `
                INSERT INTO conversations (started_by_user_id, recipient_user_id)
                VALUES (?, ?)
            `;
            const [result] = await db.query(createSql, [myUserId, recipient_user_id]);
            res.status(201).json({ conversationId: result.insertId });
        }
    } catch (error) {
        console.error('Error finding or creating conversation:', error);
        res.status(500).json({ message: 'Error finding conversation' });
    }
});
app.post('/api/messages/reply/:id', auth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const senderId = req.user.id;
        const { message_text } = req.body;
        if (!message_text) {
            return res.status(400).json({ message: 'Message text is required.' });
        }
        const [convoCheck] = await db.query(
            "SELECT * FROM conversations WHERE id = ? AND (started_by_user_id = ? OR recipient_user_id = ?)",
            [conversationId, senderId, senderId]
        );
        if (convoCheck.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const sql = `
            INSERT INTO messages (conversation_id, sender_id, message_text)
            VALUES (?, ?, ?)
        `;
        await db.query(sql, [conversationId, senderId, message_text]);
        res.status(201).json({ message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ message: 'Error sending reply' });
    }
});

// --- 7. START THE SERVER ---
async function startServer() {
    await connectToDatabase(); // Connect to DB first
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log("💡 You can now run your frontend (e.g., with Live Server)");
    });
}

startServer();