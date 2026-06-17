import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    users: [],
    pharmacies: [],
    medicines: [],
    inventory: [],
    verificationRequests: [],
    verificationReports: [],
    complaints: [],
    auditLogs: [],
    notifications: []
  }, null, 2));
}

// LowDb style in-memory representation with write-on-change
class JsonCollection {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  _read() {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }

  _write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  find(filter = {}) {
    const db = this._read();
    let records = db[this.collectionName] || [];

    // Filter matching
    if (Object.keys(filter).length > 0) {
      records = records.filter(item => {
        return Object.entries(filter).every(([key, val]) => {
          if (val && typeof val === 'object' && '$ne' in val) {
            return item[key] !== val.$ne;
          }
          if (val && typeof val === 'object' && '$in' in val) {
            return Array.isArray(val.$in) && val.$in.includes(item[key]);
          }
          return item[key] === val;
        });
      });
    }
    return records;
  }

  findOne(filter = {}) {
    const records = this.find(filter);
    return records.length > 0 ? { ...records[0], save: async function() {
      // Dummy save for model instances
      const db = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(db);
      const idx = parsed[this.collectionName].findIndex(x => x._id === this._id);
      if (idx !== -1) {
        parsed[this.collectionName][idx] = { ...this };
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
      }
      return this;
    }.bind(records[0]) } : null;
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  create(data = {}) {
    const db = this._read();
    if (!db[this.collectionName]) {
      db[this.collectionName] = [];
    }

    const newRecord = {
      _id: 'mock_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    db[this.collectionName].push(newRecord);
    this._write(db);

    return {
      ...newRecord,
      save: async function() {
        return this;
      }
    };
  }

  findByIdAndUpdate(id, update, options = {}) {
    const db = this._read();
    const records = db[this.collectionName] || [];
    const idx = records.findIndex(item => item._id === id);

    if (idx === -1) return null;

    const current = records[idx];
    
    // Support standard updating and $set/$push
    let updated = { ...current, updatedAt: new Date().toISOString() };

    if (update.$set) {
      updated = { ...updated, ...update.$set };
    } else if (update.$push) {
      Object.entries(update.$push).forEach(([key, val]) => {
        if (!Array.isArray(updated[key])) {
          updated[key] = [];
        }
        updated[key].push(val);
      });
    } else {
      updated = { ...updated, ...update };
    }

    records[idx] = updated;
    db[this.collectionName] = records;
    this._write(db);

    return updated;
  }

  deleteMany(filter = {}) {
    const db = this._read();
    let records = db[this.collectionName] || [];

    const initialLength = records.length;
    records = records.filter(item => {
      return !Object.entries(filter).every(([key, val]) => item[key] === val);
    });

    db[this.collectionName] = records;
    this._write(db);

    return { deletedCount: initialLength - records.length };
  }
}

export const dbCollections = {
  User: new JsonCollection('users'),
  Pharmacy: new JsonCollection('pharmacies'),
  Medicine: new JsonCollection('medicines'),
  Inventory: new JsonCollection('inventory'),
  VerificationRequest: new JsonCollection('verificationRequests'),
  VerificationReport: new JsonCollection('verificationReports'),
  Complaint: new JsonCollection('complaints'),
  AuditLog: new JsonCollection('auditLogs'),
  Notification: new JsonCollection('notifications')
};
