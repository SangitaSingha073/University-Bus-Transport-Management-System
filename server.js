const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 5500;

app.use(express.json());
app.use(express.static(__dirname));

// --- Database Connection ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'put_your_password',
    database: 'bus_management'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// --- In-memory bus locations array ---
const locations = [
    { latitude: 17.4334, longitude: 78.4357 },
    { latitude: 17.4560, longitude: 78.4721 },
    { latitude: 17.4201, longitude: 78.4900 },
    { latitude: 17.4410, longitude: 78.4550 },
    { latitude: 17.4650, longitude: 78.4890 },
    { latitude: 17.4125, longitude: 78.4410 },
    { latitude: 17.4399, longitude: 78.4287 },
    { latitude: 17.4508, longitude: 78.4619 },
    { latitude: 17.4286, longitude: 78.4834 },
    { latitude: 17.4720, longitude: 78.4952 },
    { latitude: 17.4080, longitude: 78.4750 },
    { latitude: 17.4600, longitude: 78.4480 },
    { latitude: 17.4189, longitude: 78.4605 },
    { latitude: 17.4475, longitude: 78.4791 },
    { latitude: 17.4300, longitude: 78.4980 }
];


let lastLocationIndex = -1;

function getRandomLocation() {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * locations.length);
    } while (newIndex === lastLocationIndex);
    lastLocationIndex = newIndex;
    return locations[newIndex];
}

// --- API Endpoints ---

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT role, id FROM users WHERE email = ? AND password_hash = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error.' });
        }

        if (results.length > 0) {
            // Now passing the user's ID along with the role for role-specific data retrieval
            res.status(200).json({ message: 'Login successful', role: results[0].role, id: results[0].id });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});

// Student Bus Information Endpoint (for student dashboard)
app.get('/api/student/businfo', (req, res) => {
    // Assuming we fetch data for the first student for simplicity
    const studentId = 1;

    const query = `
        SELECT
            b.bus_number,
            s.name AS driverName,
            s.contact_info AS driverContact,
            r.route_name
        FROM students st
        JOIN buses b ON st.bus_id = b.bus_id
        JOIN staff s ON b.driver_id = s.staff_id
        JOIN routes r ON b.route_id = r.route_id
        WHERE st.student_id = ?;
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error.' });
        }

        if (results.length > 0) {
            const data = results[0];
            const randomLocation = getRandomLocation();
            res.status(200).json({
                busDetails: {
                    busNumber: data.bus_number
                },
                driver: {
                    name: data.driverName,
                    phone: data.driverContact
                },
                route: {
                    routeName: data.route_name
                },
                location: randomLocation // Add the random location to the response
            });
        } else {
            res.status(404).json({ message: 'Bus information not found for this student.' });
        }
    });
});

// NEW Endpoint for Driver Bus Information
app.get('/api/driver/businfo', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    const query = `
        SELECT
            b.bus_number,
            r.route_name
        FROM staff s
        JOIN buses b ON s.staff_id = b.driver_id
        JOIN routes r ON b.route_id = r.route_id
        WHERE s.user_id = ?;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error.' });
        }

        if (results.length > 0) {
            const data = results[0];
            res.status(200).json({
                busDetails: {
                    busNumber: data.bus_number
                },
                route: {
                    routeName: data.route_name
                }
            });
        } else {
            res.status(404).json({ message: 'Bus information not found for this driver.' });
        }
    });
});


// --- Generic Admin Management Endpoint Function ---
const handleAdminManagement = (req, res, entityType, idField, dataTable, role, idColumnInTable) => {
    const { action, id, email, password, name, contact_info, ...dataFields } = req.body;

    if (!id && action !== 'add') {
        return res.status(400).json({ message: `ID is required for ${action} action.` });
    }

    if (action === 'add') {
        // 1. Insert into users table
        const userQuery = 'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)';
        db.query(userQuery, [email, password, role], (err, userResults) => {
            if (err) {
                console.error(`Error adding new user for ${entityType}:`, err);
                return res.status(500).json({ message: `Failed to add new ${entityType} user.` });
            }
            const newUserId = userResults.insertId;

            // 2. Insert into the specific data table
            const fields = [idColumnInTable === 'staff_id' ? 'user_id' : 'user_id', 'name', 'contact_info', ...Object.keys(dataFields)].join(', ');
            const values = [newUserId, name, contact_info, ...Object.values(dataFields)];
            const placeholders = values.map(() => '?').join(', ');
            const entityQuery = `INSERT INTO ${dataTable} (${fields}) VALUES (${placeholders})`;

            db.query(entityQuery, values, (err, entityResults) => {
                if (err) {
                    console.error(`Error adding new ${entityType}:`, err);
                    // Rollback user creation (advanced: requires transaction logic)
                    return res.status(500).json({ message: `Failed to add new ${entityType} details.` });
                }
                res.status(200).json({ message: `Successfully added new ${entityType}: ${name}.` });
            });
        });

    } else if (action === 'update') {
        const updates = [];
        const updateValues = [];
        
        // Build the SET clause for the data table
        for (const [key, value] of Object.entries({ name, contact_info, ...dataFields })) {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update.' });
        }

        // 1. Update the data table
        const entityQuery = `UPDATE ${dataTable} SET ${updates.join(', ')} WHERE ${idField} = ?`;
        db.query(entityQuery, [...updateValues, id], (err, entityResults) => {
            if (err) {
                console.error(`Error updating ${entityType}:`, err);
                return res.status(500).json({ message: `Failed to update ${entityType} details.` });
            }
            if (entityResults.affectedRows === 0) {
                return res.status(404).json({ message: `${entityType} with ID ${id} not found.` });
            }

            // 2. Update email/password in users table if provided
            const userUpdates = [];
            const userUpdateValues = [];
            let userIdQuery = `SELECT user_id FROM ${dataTable} WHERE ${idField} = ?`;
            
            db.query(userIdQuery, [id], (err, results) => {
                if (err || results.length === 0) return;
                const userId = results[0].user_id;

                if (email) {
                    userUpdates.push('email = ?');
                    userUpdateValues.push(email);
                }
                if (password) {
                    userUpdates.push('password_hash = ?');
                    userUpdateValues.push(password);
                }
                
                if (userUpdates.length > 0) {
                    const userUpdateQuery = `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`;
                    db.query(userUpdateQuery, [...userUpdateValues, userId], (err) => {
                        if (err) console.error(`Error updating user data for ${entityType}:`, err);
                    });
                }
                res.status(200).json({ message: `Successfully updated ${entityType} with ID ${id}.` });
            });
        });

    } else if (action === 'delete') {
        // Find user ID first
        let userIdQuery = `SELECT user_id FROM ${dataTable} WHERE ${idField} = ?`;

        db.query(userIdQuery, [id], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).json({ message: `${entityType} with ID ${id} not found.` });
            }
            const userId = results[0].user_id;

            // 1. Delete from the data table
            const entityDeleteQuery = `DELETE FROM ${dataTable} WHERE ${idField} = ?`;
            db.query(entityDeleteQuery, [id], (err, entityResults) => {
                if (err) {
                    console.error(`Error deleting ${entityType}:`, err);
                    return res.status(500).json({ message: `Failed to delete ${entityType}.` });
                }

                // 2. Delete from users table
                const userDeleteQuery = 'DELETE FROM users WHERE id = ?';
                db.query(userDeleteQuery, [userId], (err) => {
                    if (err) console.error(`Error deleting user data for ${entityType}:`, err);
                });
                
                res.status(200).json({ message: `Successfully deleted ${entityType} with ID ${id}.` });
            });
        });
    } else {
        res.status(400).json({ message: 'Invalid action.' });
    }
};

// --- Specific Admin Management Endpoints ---

// Student Management
app.post('/api/admin/students', (req, res) => {
    handleAdminManagement(req, res, 'student', 'student_id', 'students', 'student', 'student_id');
});

// Driver Management
app.post('/api/admin/drivers', (req, res) => {
    // For drivers, we also need to include 'type' = 'driver'
    req.body.type = 'driver'; 
    handleAdminManagement(req, res, 'driver', 'staff_id', 'staff', 'driver', 'staff_id');
});

// Bus Management
app.post('/api/admin/buses', (req, res) => {
    // Bus details: bus_number, capacity, driver_id, route_id, estimated_time
    const { action, id, bus_number, capacity, driver_id, route_id, estimated_time } = req.body;

    let query;
    let values;

    if (action === 'add') {
        query = 'INSERT INTO buses (bus_number, capacity, driver_id, route_id) VALUES (?, ?, ?, ?)';
        values = [bus_number, capacity, driver_id, route_id];
    } else if (action === 'update') {
        const updates = [];
        values = [];

        if (bus_number) { updates.push('bus_number = ?'); values.push(bus_number); }
        if (capacity) { updates.push('capacity = ?'); values.push(capacity); }
        if (driver_id) { updates.push('driver_id = ?'); values.push(driver_id); }
        if (route_id) { updates.push('route_id = ?'); values.push(route_id); }
        

        if (updates.length === 0) return res.status(400).json({ message: 'No fields to update.' });

        query = `UPDATE buses SET ${updates.join(', ')} WHERE bus_id = ?`;
        values.push(id);

    } else if (action === 'delete') {
        query = 'DELETE FROM buses WHERE bus_id = ?';
        values = [id];
    } else {
        return res.status(400).json({ message: 'Invalid action.' });
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Bus management query error:', err);
            return res.status(500).json({ message: 'Database query error.' });
        }
        if (results.affectedRows === 0 && action !== 'add') {
             return res.status(404).json({ message: `Bus with ID ${id} not found.` });
        }
        res.status(200).json({ message: `Bus ${action} successful.` });
    });
});

// Route Management
app.post('/api/admin/routes', (req, res) => {
    // Route details: route_name, route_details
    const { action, id, route_name, route_details } = req.body;

    let query;
    let values;

    if (action === 'add') {
        query = 'INSERT INTO routes (route_name, route_details) VALUES (?, ?)';
        values = [route_name, route_details];
    } else if (action === 'update') {
        const updates = [];
        values = [];

        if (route_name) { updates.push('route_name = ?'); values.push(route_name); }
        if (route_details) { updates.push('route_details = ?'); values.push(route_details); }

        if (updates.length === 0) return res.status(400).json({ message: 'No fields to update.' });

        query = `UPDATE routes SET ${updates.join(', ')} WHERE route_id = ?`;
        values.push(id);

    } else if (action === 'delete') {
        query = 'DELETE FROM routes WHERE route_id = ?';
        values = [id];
    } else {
        return res.status(400).json({ message: 'Invalid action.' });
    }

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Route management query error:', err);
            return res.status(500).json({ message: 'Database query error.' });
        }
        if (results.affectedRows === 0 && action !== 'add') {
             return res.status(404).json({ message: `Route with ID ${id} not found.` });
        }
        res.status(200).json({ message: `Route ${action} successful.` });
    });
});


// Serve the frontend file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
