const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const { Parser } = require('json2csv');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Pagination' // Use your database name here
});

db.connect(err => {
    if (err) throw err;
    console.log('Database connected!');
});

// Get filtered data
app.get('/data', (req, res) => {
    const { startDate, endDate, categoryId, statusId } = req.query;

    let query = `
        SELECT reports.*, categories.name AS category_name, statuses.name AS status_name
        FROM reports
        LEFT JOIN categories ON reports.category_id = categories.id
        LEFT JOIN statuses ON reports.status_id = statuses.id
        WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
        query += ' AND date_column BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    if (categoryId) {
        query += ' AND reports.category_id = ?';
        params.push(categoryId);
    }

    if (statusId) {
        query += ' AND reports.status_id = ?';
        params.push(statusId);
    }

    // Remove pagination limit
    // const offset = (page - 1) * limit;
    // query += ' LIMIT ?, ?';
    // params.push(parseInt(offset), parseInt(limit));

    db.query(query, params, (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

// Insert reports (single or multiple) in JSON format
app.post('/reports', (req, res) => {
    console.log(req.body.title);
    const reports = Array.isArray(req.body) ? req.body : [req.body]; // Wrap single report in an array

    // Basic validation for each report
    for (const report of reports) {
        if (!report.title || !report.description || !report.date_column || !report.category_id || !report.status_id) {
            return res.status(400).json({
                message: 'All fields are required for each report',
                invalidReport: report // Return the invalid report for debugging
            });
        }
    }

    const query = `
        INSERT INTO reports (title, description, date_column, category_id, status_id)
        VALUES ?
    `;

    const values = reports.map(report => [
        report.title,
        report.description,
        report.date_column,
        report.category_id,
        report.status_id
    ]);

    db.query(query, [values], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error inserting data' });
        }
        res.status(201).json({ message: `${results.affectedRows} reports created successfully` });
    });
});

// Export data as CSV
app.get('/export/csv', (req, res) => {
    const { startDate, endDate, categoryId, statusId } = req.query;

    let query = `
        SELECT reports.*, categories.name AS category_name, statuses.name AS status_name
        FROM reports 
        LEFT JOIN categories ON reports.category_id = categories.id
        LEFT JOIN statuses ON reports.status_id = statuses.id
        WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
        query += ' AND date_column BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    if (categoryId) {
        query += ' AND reports.category_id = ?';
        params.push(categoryId);
    }

    if (statusId) {
        query += ' AND reports.status_id = ?';
        params.push(statusId);
    }

    db.query(query, params, (error, results) => {
        if (error) throw error;

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(results);
        res.header('Content-Type', 'text/csv');
        res.attachment('data.csv');
        res.send(csv);
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
