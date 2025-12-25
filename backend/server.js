const bcrypt = require("bcrypt");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
const db = new sqlite3.Database("database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      time TEXT,
      is_available INTEGER DEFAULT 1,
      UNIQUE(date, time)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER UNIQUE,
      user TEXT
    )
  `);

  // ✅ async admin creation (correct way)
  (async () => {
    const adminHash = await bcrypt.hash("admin123", 10);

    db.run(
      `
      INSERT OR IGNORE INTO users (username, password, role)
      VALUES ('admin', ?, 'admin')
      `,
      [adminHash]
    );
  })();
});

// ================= AUTH =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) {
        return res.json({ success: false });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.json({ success: false });
      }

      res.json({
        success: true,
        username: user.username,
        role: user.role
      });
    }
  );
});


app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Missing fields" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')",
    [username, hashedPassword],
    (err) => {
      if (err) {
        return res.json({ success: false, message: "User already exists" });
      }
      res.json({ success: true });
    }
  );
});


// ================= SLOTS =================
app.get("/slots", (req, res) => {
  db.all(
    "SELECT * FROM slots WHERE is_available = 1",
    [],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

// ================= ADMIN =================
app.post("/add-slot", (req, res) => {
  const { date, time, role } = req.body;

  if (role !== "admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  if (!date || !time) {
    return res.json({ message: "Date and time required" });
  }

  db.run(
    "INSERT INTO slots (date, time, is_available) VALUES (?, ?, 1)",
    [date, time],
    (err) => {
      if (err) {
        return res.json({ message: "Slot already exists" });
      }
      res.json({ message: "Slot added" });
    }
  );
});

app.get("/admin/bookings", (req, res) => {
  db.all(
    `
    SELECT bookings.user, slots.date, slots.time
    FROM bookings
    JOIN slots ON bookings.slot_id = slots.id
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

// ================= BOOKINGS =================
app.post("/book/:id", (req, res) => {
  const slotId = req.params.id;
  const { username } = req.body;

  if (!username) {
    return res.json({ message: "Login required" });
  }

  db.get(
    "SELECT * FROM slots WHERE id = ? AND is_available = 1",
    [slotId],
    (err, slot) => {
      if (!slot) {
        return res.json({ message: "Slot already booked" });
      }

      db.run(
        "INSERT INTO bookings (slot_id, user) VALUES (?, ?)",
        [slotId, username],
        (err) => {
          if (err) {
            return res.json({ message: "Already booked" });
          }

          db.run(
            "UPDATE slots SET is_available = 0 WHERE id = ?",
            [slotId]
          );

          res.json({ message: "Booking confirmed" });
        }
      );
    }
  );
});

app.post("/cancel-booking", (req, res) => {
  const { username, slotId } = req.body;

  if (!username || !slotId) {
    return res.json({ message: "Invalid request" });
  }

  // Check booking belongs to user
  db.get(
    "SELECT * FROM bookings WHERE slot_id = ? AND user = ?",
    [slotId, username],
    (err, booking) => {
      if (!booking) {
        return res.json({ message: "Unauthorized cancel attempt" });
      }

      // Delete booking
      db.run(
        "DELETE FROM bookings WHERE slot_id = ?",
        [slotId],
        () => {
          // Make slot available again
          db.run(
            "UPDATE slots SET is_available = 1 WHERE id = ?",
            [slotId]
          );

          res.json({ message: "Booking cancelled" });
        }
      );
    }
  );
});


app.get("/my-bookings/:username", (req, res) => {
  const username = req.params.username;

  db.all(
    `
    SELECT slots.id AS slotId, slots.date, slots.time
    FROM bookings
    JOIN slots ON bookings.slot_id = slots.id
    WHERE bookings.user = ?
    `,
    [username],
    (err, rows) => {
      res.json(rows);
    }
  );
});

app.get("/admin/stats", (req, res) => {
  db.get("SELECT COUNT(*) AS totalSlots FROM slots", (e1, s) => {
    db.get("SELECT COUNT(*) AS bookedSlots FROM bookings", (e2, b) => {
      res.json({
        totalSlots: s.totalSlots,
        bookedSlots: b.bookedSlots
      });
    });
  });
});


// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
