const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./ohsnap.db', (err) => {
    if (err) {
        console.error('Gagal membuka database', err.message);
    } else {
        console.log('Terhubung ke database SQLite.');
    }
});

db.serialize(() => {
    // Tabel Frames (Studio & Frame Layout)
    db.run(`CREATE TABLE IF NOT EXISTS frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        filename TEXT
    )`);

    // Tabel Messages (Kritik & Saran Pelanggan)
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT
    )`);

    // Tabel Promos (3 Kotak Preview Promo Homepage)
    db.run(`CREATE TABLE IF NOT EXISTS promos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        filename TEXT
    )`);

    // Tabel Video Feeds (5 Slot Video Portrait IG/TikTok)
    db.run(`CREATE TABLE IF NOT EXISTS video_feeds (
        slot INTEGER PRIMARY KEY,
        title TEXT,
        link_url TEXT,
        filename TEXT
    )`);

    // Tabel Homepage Settings (Teks Hero)
    db.run(`CREATE TABLE IF NOT EXISTS homepage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hero_title TEXT,
        hero_subtitle TEXT
    )`);
});

module.exports = db;