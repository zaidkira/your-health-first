import { createHmac, randomBytes } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";

function hashSeedPassword(password: string): string {
  const secret = process.env.SESSION_SECRET ?? "myhealthfirst-secret-key";
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", secret).update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

export async function bootstrapLocalDatabase(client: PGlite): Promise<void> {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      wilaya TEXT,
      blood_type TEXT,
      role TEXT NOT NULL DEFAULT 'patient',
      device_id TEXT UNIQUE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      family_member_id INTEGER,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      times TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medication_reminders (
      id SERIAL PRIMARY KEY,
      medication_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      scheduled_time TEXT NOT NULL,
      date TEXT NOT NULL,
      taken BOOLEAN NOT NULL DEFAULT FALSE,
      taken_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      family_member_id INTEGER,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      file_name TEXT,
      record_date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      wilaya TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      rating REAL NOT NULL DEFAULT 4.0,
      review_count INTEGER NOT NULL DEFAULT 0,
      available_days TEXT NOT NULL,
      available_hours TEXT NOT NULL DEFAULT '08:00 - 17:00',
      consultation_fee INTEGER NOT NULL,
      image_url TEXT,
      is_online_consultation BOOLEAN NOT NULL DEFAULT FALSE,
      lat REAL,
      lng REAL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      family_member_id INTEGER,
      family_member_name TEXT,
      doctor_id INTEGER NOT NULL,
      doctor_name TEXT NOT NULL,
      doctor_specialty TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      is_online BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pharmacies (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      wilaya TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      is_open_now BOOLEAN NOT NULL DEFAULT TRUE,
      is_24h BOOLEAN NOT NULL DEFAULT FALSE,
      open_time TEXT NOT NULL DEFAULT '08:00',
      close_time TEXT NOT NULL DEFAULT '21:00',
      medicines_json TEXT NOT NULL DEFAULT '[]',
      lat REAL,
      lng REAL
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      group_name TEXT,
      date_of_birth TEXT,
      blood_type TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS record_shares (
      id SERIAL PRIMARY KEY,
      record_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      message TEXT,
      doctor_reply TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chronic_conditions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      diagnosed_year TEXT,
      severity TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      family_member_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relationship TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS group_messages (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bracelet_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id),
      family_member_id INTEGER,
      heart_rate INTEGER NOT NULL,
      spo2 INTEGER NOT NULL,
      steps INTEGER NOT NULL,
      activity TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      device_id TEXT NOT NULL
    );
  `);

  const doctorCountRes = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM doctors");
  if (Number(doctorCountRes.rows[0]?.count ?? 0) === 0) {
    const sampleDoctors = [
      {
        name: "Dr. Amine Benali",
        email: "amine.benali@health.dz",
        phone: "0550123456",
        wilaya: "Algiers",
        specialty: "Cardiologist",
        address: "12 Rue Didouche Mourad, Alger Centre",
        rating: 4.8,
        reviewCount: 42,
        availableDays: "Sun-Thu",
        availableHours: "08:30 - 16:30",
        consultationFee: 3000,
        isOnline: true,
        lat: 36.7689,
        lng: 3.0588,
      },
      {
        name: "Dr. Yasmine Khelifi",
        email: "yasmine.khelifi@health.dz",
        phone: "0551234567",
        wilaya: "Oran",
        specialty: "Pediatrician",
        address: "45 Boulevard Millenium, Oran",
        rating: 4.9,
        reviewCount: 65,
        availableDays: "Sat-Wed",
        availableHours: "09:00 - 17:00",
        consultationFee: 2500,
        isOnline: true,
        lat: 35.7026,
        lng: -0.6054,
      },
      {
        name: "Dr. Karim Mansouri",
        email: "karim.mansouri@health.dz",
        phone: "0552345678",
        wilaya: "Constantine",
        specialty: "General Practitioner",
        address: "8 Avenue Aouati Mostefa, Constantine",
        rating: 4.7,
        reviewCount: 38,
        availableDays: "Sun-Thu",
        availableHours: "08:00 - 18:00",
        consultationFee: 1800,
        isOnline: false,
        lat: 36.365,
        lng: 6.6147,
      },
      {
        name: "Dr. Meriem Bouzid",
        email: "meriem.bouzid@health.dz",
        phone: "0553456789",
        wilaya: "Algiers",
        specialty: "Dermatologist",
        address: "24 Rue des Freres Bouadou, Bir Mourad Rais",
        rating: 4.6,
        reviewCount: 29,
        availableDays: "Sun-Wed",
        availableHours: "09:00 - 16:00",
        consultationFee: 2800,
        isOnline: true,
        lat: 36.7428,
        lng: 3.0503,
      },
      {
        name: "Dr. Sofiane Haddad",
        email: "sofiane.haddad@health.dz",
        phone: "0554567890",
        wilaya: "Annaba",
        specialty: "Orthopedist",
        address: "19 Cours de la Revolution, Annaba",
        rating: 4.5,
        reviewCount: 21,
        availableDays: "Sun-Thu",
        availableHours: "08:30 - 15:30",
        consultationFee: 2600,
        isOnline: false,
        lat: 36.9,
        lng: 7.7667,
      },
      {
        name: "Dr. Nadia Toumi",
        email: "nadia.toumi@health.dz",
        phone: "0555678901",
        wilaya: "Blida",
        specialty: "Ophthalmologist",
        address: "5 Place du 1er Novembre, Blida",
        rating: 4.8,
        reviewCount: 33,
        availableDays: "Sat-Thu",
        availableHours: "08:30 - 16:30",
        consultationFee: 2500,
        isOnline: false,
        lat: 36.47,
        lng: 2.8277,
      },
      {
        name: "Dr. Rachid Zerhouni",
        email: "rachid.zerhouni@health.dz",
        phone: "0556789012",
        wilaya: "Setif",
        specialty: "Neurologist",
        address: "31 Avenue de l'ALN, Setif",
        rating: 4.7,
        reviewCount: 19,
        availableDays: "Sun-Thu",
        availableHours: "09:00 - 16:00",
        consultationFee: 3200,
        isOnline: true,
        lat: 36.1911,
        lng: 5.4137,
      },
      {
        name: "Dr. Samira Ait Ali",
        email: "samira.aitali@health.dz",
        phone: "0557890123",
        wilaya: "Tizi Ouzou",
        specialty: "Gynecologist",
        address: "14 Rue Abane Ramdane, Tizi Ouzou",
        rating: 4.9,
        reviewCount: 51,
        availableDays: "Sun-Thu",
        availableHours: "08:30 - 16:30",
        consultationFee: 2700,
        isOnline: true,
        lat: 36.7118,
        lng: 4.0459,
      },
    ];

    const seedHash = hashSeedPassword("doctor123");
    for (const doc of sampleDoctors) {
      const userRes = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, password_hash, phone, wilaya, role)
         VALUES ($1, $2, $3, $4, $5, 'doctor')
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [doc.name, doc.email, seedHash, doc.phone, doc.wilaya]
      );
      const userId = userRes.rows[0].id;
      await client.query(
        `INSERT INTO doctors (user_id, name, specialty, wilaya, address, phone, rating, review_count, available_days, available_hours, consultation_fee, is_online_consultation, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          userId,
          doc.name,
          doc.specialty,
          doc.wilaya,
          doc.address,
          doc.phone,
          doc.rating,
          doc.reviewCount,
          doc.availableDays,
          doc.availableHours,
          doc.consultationFee,
          doc.isOnline,
          doc.lat,
          doc.lng,
        ]
      );
    }
  }

  const pharmacyCountRes = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM pharmacies");
  if (Number(pharmacyCountRes.rows[0]?.count ?? 0) === 0) {
    const samplePharmacies = [
      {
        name: "Pharmacie El Djazair",
        email: "eldjazair@pharmacy.dz",
        phone: "021634512",
        wilaya: "Algiers",
        address: "18 Rue Larbi Ben M'hidi, Alger Centre",
        is24h: true,
        openTime: "00:00",
        closeTime: "23:59",
        lat: 36.7745,
        lng: 3.0586,
        medicines: [
          { name: "Doliprane 1000mg", available: true, price: 250 },
          { name: "Amoxicilline 500mg", available: true, price: 450 },
          { name: "Augmentin 1g", available: true, price: 1100 },
          { name: "Ventoline 100mcg", available: true, price: 650 },
        ],
      },
      {
        name: "Pharmacie Pasteur Oran",
        email: "pasteur.oran@pharmacy.dz",
        phone: "041332211",
        wilaya: "Oran",
        address: "7 Rue de la Soummam, Oran",
        is24h: false,
        openTime: "08:00",
        closeTime: "22:00",
        lat: 35.6971,
        lng: -0.6308,
        medicines: [
          { name: "Doliprane 1000mg", available: true, price: 250 },
          { name: "Glucophage 850mg", available: true, price: 520 },
          { name: "Tahor 20mg", available: false, price: 980 },
          { name: "Vitamin C", available: true, price: 300 },
        ],
      },
      {
        name: "Pharmacie Cirta",
        email: "cirta@pharmacy.dz",
        phone: "031924455",
        wilaya: "Constantine",
        address: "33 Rue Zighoud Youcef, Constantine",
        is24h: false,
        openTime: "08:00",
        closeTime: "21:00",
        lat: 36.3689,
        lng: 6.6122,
        medicines: [
          { name: "Aspegic 1000mg", available: true, price: 220 },
          { name: "Amoxicilline 500mg", available: true, price: 450 },
          { name: "Spasfon", available: true, price: 380 },
        ],
      },
      {
        name: "Pharmacie Centrale Annaba",
        email: "centrale.annaba@pharmacy.dz",
        phone: "038867788",
        wilaya: "Annaba",
        address: "2 Boulevard Ibn Khaldoun, Annaba",
        is24h: true,
        openTime: "00:00",
        closeTime: "23:59",
        lat: 36.902,
        lng: 7.7555,
        medicines: [
          { name: "Doliprane 1000mg", available: true, price: 250 },
          { name: "Levothyrox 50mcg", available: true, price: 410 },
          { name: "Insuline Lantus", available: true, price: 2400 },
        ],
      },
    ];

    const seedHash = hashSeedPassword("pharmacy123");
    for (const ph of samplePharmacies) {
      const userRes = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, password_hash, phone, wilaya, role)
         VALUES ($1, $2, $3, $4, $5, 'pharmacy')
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [ph.name, ph.email, seedHash, ph.phone, ph.wilaya]
      );
      const userId = userRes.rows[0].id;
      await client.query(
        `INSERT INTO pharmacies (user_id, name, wilaya, address, phone, is_open_now, is_24h, open_time, close_time, medicines_json, lat, lng)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          ph.name,
          ph.wilaya,
          ph.address,
          ph.phone,
          ph.is24h,
          ph.openTime,
          ph.closeTime,
          JSON.stringify(ph.medicines),
          ph.lat,
          ph.lng,
        ]
      );
    }
  }
}

