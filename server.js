require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json());

// Membuat folder 'uploads' jika belum ada
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Konfigurasi Multer untuk Upload File (Gambar & Video)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Akses folder uploads secara publik
app.use('/uploads', express.static('uploads'));

// --- 1. RUTE API FRAMES ---
app.get('/api/frames', (req, res) => {
    db.all(`SELECT id, title, description, CASE WHEN filename IS NOT NULL AND filename != '' THEN 'http://localhost:${PORT}/uploads/' || filename ELSE '' END as image_url FROM frames`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/frames', upload.single('frameImage'), (req, res) => {
    const { title, description } = req.body;
    const filename = req.file ? req.file.filename : null;

    if (!title || !filename) {
        return res.status(400).json({ error: 'Judul dan file gambar wajib diisi!' });
    }

    const query = `INSERT INTO frames (title, description, filename) VALUES (?, ?, ?)`;
    db.run(query, [title, description || '', filename], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(200).json({ message: 'Frame berhasil diunggah!', id: this.lastID });
    });
});

// --- 2. RUTE API MESSAGES ---
app.get('/api/messages', (req, res) => {
    db.all(`SELECT * FROM messages`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/messages', (req, res) => {
    const { name, email, message } = req.body;
    const query = `INSERT INTO messages (name, email, message) VALUES (?, ?, ?)`;
    db.run(query, [name, email, message], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pesan berhasil dikirim!', id: this.lastID });
    });
});

// --- 3. RUTE API PROMOS (3 Kotak Preview Homepage) ---
app.get('/api/promos', (req, res) => {
    db.all(`SELECT id, title, description, CASE WHEN filename IS NOT NULL AND filename != '' THEN 'http://localhost:${PORT}/uploads/' || filename ELSE '' END as image_url FROM promos`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/promos', upload.single('promoImage'), (req, res) => {
    const { title, description } = req.body;
    const filename = req.file ? req.file.filename : null;

    if (!title || !description) {
        return res.status(400).json({ error: 'Judul dan deskripsi promo wajib diisi!' });
    }

    const query = `INSERT INTO promos (title, description, filename) VALUES (?, ?, ?)`;
    db.run(query, [title, description, filename], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(200).json({ message: 'Promo homepage berhasil disimpan!', id: this.lastID });
    });
});

// --- 4. RUTE API VIDEO FEED (5 Slot Portrait Autoplay) ---
app.get('/api/video-feed', (req, res) => {
    db.all(`SELECT slot, title, link_url as linkUrl, CASE WHEN filename IS NOT NULL AND filename != '' THEN 'http://localhost:${PORT}/uploads/' || filename ELSE '' END as video_url FROM video_feeds`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/video-feed', upload.single('videoFile'), (req, res) => {
    const { slot, title, linkUrl } = req.body;
    const filename = req.file ? req.file.filename : null;

    if (!slot) {
        return res.status(400).json({ error: 'Nomor slot video wajib diisi!' });
    }

    // Cek apakah slot sudah ada
    db.get(`SELECT filename FROM video_feeds WHERE slot = ?`, [slot], (err, row) => {
        const activeFilename = filename || (row ? row.filename : null);

        const query = `INSERT OR REPLACE INTO video_feeds (slot, title, link_url, filename) VALUES (?, ?, ?, ?)`;
        db.run(query, [slot, title || '', linkUrl || '#', activeFilename], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.status(200).json({ message: 'Video feed berhasil diperbarui!' });
        });
    });
});

// --- 5. RUTE API HOMEPAGE GABUNGAN (Hero, Studio Gallery, Promos, Video Feeds) ---
app.get('/api/homepage', async (req, res) => {
    try {
        db.get(`SELECT hero_title, hero_subtitle FROM homepage LIMIT 1`, [], async (err, heroRow) => {
            const hero = heroRow ? { title: heroRow.hero_title, subtitle: heroRow.hero_subtitle } : { title: "Dengan Gaya Aesthetic", subtitle: "Self-photo studio & photobox modern..." };
            
            db.all(`SELECT id, title, description, CASE WHEN filename IS NOT NULL AND filename != '' THEN 'http://localhost:${PORT}/uploads/' || filename ELSE '' END as image_url FROM frames LIMIT 4`, [], (err, studioRows) => {
                db.all(`SELECT id, title, description, CASE WHEN filename IS NOT NULL AND filename != '' THEN 'http://localhost:${PORT}/uploads/' || filename ELSE '' END as image_url FROM promos LIMIT 3`, [], (err, promoRows) => {
                    db.all(`SELECT slot, title, link_url as linkUrl, CASE WHEN filename IS NOT NULL AND filename != '' THEN 'http://localhost:${PORT}/uploads/' || filename ELSE '' END as video_url FROM video_feeds`, [], (err, videoRows) => {
                        res.json({
                            hero: hero,
                            studio_gallery: studioRows || [],
                            promos: promoRows || [],
                            video_feeds: videoRows || []
                        });
                    });
                });
            });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/homepage', (req, res) => {
    const { hero } = req.body;
    if (hero) {
        db.run(`DELETE FROM homepage`, [], (err) => {
            db.run(`INSERT INTO homepage (hero_title, hero_subtitle) VALUES (?, ?)`, [hero.title, hero.subtitle], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: "Hero berhasil diperbarui!" });
            });
        });
    } else {
        res.status(400).json({ error: "Data hero tidak valid." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server OH SNAP! aktif di http://localhost:${PORT}`);
});