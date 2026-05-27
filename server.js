const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
// const sqlite3 = require('sqlite3').verbose(); // Disabled due to binary incompatibility in preview
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve fee structure PDF from disk and handle pre-generation to avoid 403 Forbidden errors
const pregenerateFeeStructurePDF = async () => {
    try {
        const fs = require('fs');
        let srcPath = path.join(__dirname, 'Fee Structure.pdf');
        if (!fs.existsSync(srcPath)) {
            srcPath = path.join(__dirname, 'assets', 'Fee Structure.pdf');
        }
        const destPath = path.join(__dirname, 'assets', 'fee-structure-2026.pdf');
        
        // Ensure assets directory exists
        const dirPath = path.dirname(destPath);
        if (!fs.existsSync(dirPath)){
            fs.mkdirSync(dirPath, { recursive: true });
        }

        if (fs.existsSync(srcPath)) {
            const stats = fs.statSync(srcPath);
            if (stats.isFile() && stats.size > 1024) {
                console.log(`Copying high-quality fee structure PDF from ${srcPath} to assets/fee-structure-2026.pdf (size: ${stats.size} bytes)...`);
                fs.copyFileSync(srcPath, destPath);
                console.log('Fee structure PDF successfully copied!');
                return; // Exit early to avoid running the programmatically generated pdf-lib logic
            } else {
                console.log(`Source PDF "${srcPath}" is too small or empty (${stats.size} bytes). Ignoring copy and generating automatically...`);
            }
        }

        console.log('Pre-generating premium fee structure PDF on disk...');
        
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 850]);
        const { width, height } = page.getSize();
        
        const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const primaryColor = rgb(15 / 255, 31 / 255, 63 / 255);
        const accentColor = rgb(250 / 255, 204 / 255, 21 / 255);
        const darkColor = rgb(15 / 255, 23 / 255, 42 / 255);
        const lightGray = rgb(248 / 255, 250 / 255, 252 / 255);
        const borderGray = rgb(226 / 255, 232 / 255, 240 / 255);
        const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);

        // Header Background Banner
        page.drawRectangle({
            x: 0,
            y: height - 130,
            width: width,
            height: 130,
            color: primaryColor,
        });

        // Yellow Accent bar
        page.drawRectangle({
            x: 0,
            y: height - 135,
            width: width,
            height: 5,
            color: accentColor,
        });

        // Banner Text
        page.drawText('MAJESTIC PRIMARY & HIGH SCHOOL', {
            x: 40,
            y: height - 55,
            size: 16,
            font: fontBold,
            color: accentColor,
        });

        page.drawText('Official Academic Fee Structure & Installments Plan', {
            x: 40,
            y: height - 75,
            size: 11,
            font: fontSans,
            color: rgb(255 / 255, 255 / 255, 255 / 255),
        });

        page.drawText('Academic Year: 2026 - 2027  |  Mysuru, Karnataka', {
            x: 40,
            y: height - 95,
            size: 9,
            font: fontSans,
            color: rgb(200 / 255, 200 / 255, 200 / 255),
        });

        let cursorY = height - 180;

        // Intro message
        page.drawText('To Caring Parents & Guardians,', {
            x: 40,
            y: cursorY,
            size: 10,
            font: fontBold,
            color: darkColor,
        });

        cursorY -= 15;
        page.drawText('Below is the approved annual rate structure with standard flexible payment timelines:', {
            x: 40,
            y: cursorY,
            size: 9,
            font: fontSans,
            color: textMuted,
        });

        cursorY -= 30;

        // Draw Table Header
        page.drawRectangle({
            x: 40,
            y: cursorY,
            width: width - 80,
            height: 22,
            color: primaryColor,
        });

        const headers = ['Grades', 'Total Fee', 'Inst. 1 (Adm.)', 'Inst. 2 (Oct)', 'Inst. 3 (Jan)'];
        const colWidths = [130, 95, 100, 95, 100];
        let colX = 40;
        
        headers.forEach((h, idx) => {
            page.drawText(h, {
                x: colX + 10,
                y: cursorY + 6,
                size: 8.5,
                font: fontBold,
                color: rgb(255 / 255, 255 / 255, 255 / 255),
            });
            colX += colWidths[idx];
        });

        const feeData = [
            { grades: 'PRE-KG', total: 'Rs. 11,000', inst1: 'Rs. 6,000', inst2: 'Rs. 2,500', inst3: 'Rs. 2,500' },
            { grades: 'L.K.G to U.K.G', total: 'Rs. 14,000', inst1: 'Rs. 8,000', inst2: 'Rs. 3,000', inst3: 'Rs. 3,000' },
            { grades: 'Class I to V', total: 'Rs. 16,000', inst1: 'Rs. 10,000', inst2: 'Rs. 3,000', inst3: 'Rs. 3,000' },
            { grades: 'Class VI to VII', total: 'Rs. 17,000', inst1: 'Rs. 12,000', inst2: 'Rs. 2,500', inst3: 'Rs. 2,500' },
            { grades: 'Class VIII to IX', total: 'Rs. 18,000', inst1: 'Rs. 12,000', inst2: 'Rs. 3,000', inst3: 'Rs. 3,000' },
            { grades: 'Class X', total: 'Rs. 20,000', inst1: 'Rs. 12,000', inst2: 'Rs. 4,000', inst3: 'Rs. 4,000' }
        ];

        cursorY -= 20;

        feeData.forEach((row, rIdx) => {
            if (rIdx % 2 === 1) {
                page.drawRectangle({
                    x: 40,
                    y: cursorY,
                    width: width - 80,
                    height: 20,
                    color: lightGray,
                });
            }

            page.drawLine({
                start: { x: 40, y: cursorY },
                end: { x: width - 40, y: cursorY },
                thickness: 0.5,
                color: borderGray,
            });

            colX = 40;
            // Grades
            page.drawText(row.grades, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontBold, color: darkColor });
            colX += colWidths[0];
            // Total
            page.drawText(row.total, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontBold, color: primaryColor });
            colX += colWidths[1];
            // Inst1
            page.drawText(row.inst1, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontSans, color: darkColor });
            colX += colWidths[2];
            // Inst2
            page.drawText(row.inst2, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontSans, color: darkColor });
            colX += colWidths[3];
            // Inst3
            page.drawText(row.inst3, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontSans, color: darkColor });

            cursorY -= 20;
        });

        // Add Notes Section
        cursorY -= 15;
        page.drawText('IMPORTANT UNDERTAKINGS & POLICIES', {
            x: 40,
            y: cursorY,
            size: 10,
            font: fontBold,
            color: primaryColor,
        });

        page.drawLine({
            start: { x: 40, y: cursorY - 5 },
            end: { x: width - 40, y: cursorY - 5 },
            thickness: 0.5,
            color: primaryColor,
        });

        const policyNotes = [
            '1. Deadlines: 1st Installment at admission time. 2nd Installment by Oct 15. 3rd Installment by Jan 15.',
            '2. Fine policy: Reasonable late fee charge of Rs. 10 per day is collected after the respective grace periods.',
            '3. Refund: Under uniform regulations, the fees paid during admission intakes are non-refundable.',
            '4. Verification: Receipts are printed and stamped directly. Retain receipts for proof of completion.'
        ];

        cursorY -= 20;
        policyNotes.forEach((note) => {
            page.drawText(note, {
                x: 40,
                y: cursorY,
                size: 8,
                font: fontSans,
                color: darkColor,
            });
            cursorY -= 14;
        });

        // Signatures area
        cursorY -= 15;
        page.drawLine({
            start: { x: 40, y: cursorY },
            end: { x: 190, y: cursorY },
            thickness: 0.5,
            color: textMuted,
        });

        page.drawLine({
            start: { x: 410, y: cursorY },
            end: { x: 560, y: cursorY },
            thickness: 0.5,
            color: textMuted,
        });

        cursorY -= 12;
        page.drawText('Account Supervisor Center', {
            x: 45,
            y: cursorY,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        page.drawText('Chairman Signatory Authority', {
            x: 415,
            y: cursorY,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        // Document Footer Annotation
        page.drawText('Official Majestic School Document  |  Generated Dynamically under Board Supervision', {
            x: width / 2 - 180,
            y: 20,
            size: 7.5,
            font: fontSans,
            color: textMuted,
        });

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(destPath, Buffer.from(pdfBytes));
        console.log('Fee structure PDF successfully pre-generated and stored on disk!');
    } catch (err) {
        console.error('Failed to pre-generate fee structure PDF:', err);
    }
};

// Initiate pre-generation on startup
pregenerateFeeStructurePDF();

// Handle direct PDF route
app.get('/assets/fee-structure-2026.pdf', (req, res) => {
    const fs = require('fs');
    const filePath = path.join(__dirname, 'assets', 'fee-structure-2026.pdf');
    if (fs.existsSync(filePath)) {
        if (req.query.download === 'true') {
            return res.download(filePath, 'Majestic-Fee-Structure-2026.pdf');
        }
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(filePath);
    } else {
        // Fallback in case file isn't generated yet
        return res.status(404).send('Fee structure PDF is currently being compiled. Please refresh in a moment.');
    }
});

// Serve static files first so asset requests like /assets/logo.png work correctly
app.use(express.static(path.join(__dirname, ''), {
    extensions: ['html', 'htm'],
    index: 'index.html'
}));

// Serve friendly page routes like /about and /contact
app.get('/:page', (req, res, next) => {
    const page = req.params.page;

    // Ignore API routes, asset directories, and requests that look like file names
    if (page.startsWith('api') || page.includes('.') || ['assets', 'css', 'js', 'node_modules'].includes(page)) {
        return next();
    }

    const filePath = path.join(__dirname, `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            next();
        }
    });
});

app.use(session({
    secret: 'majestic_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Setup In-Memory Database for reliability in this environment
const usersStore = [];

// Initialize default admin
bcrypt.hash('admin123', 10, (err, hash) => {
    if (!err) {
        usersStore.push({
            id: 1,
            name: 'Admin',
            email: 'majestichps@gmail.com',
            password: hash,
            role: 'admin',
            class: 'N/A',
            parentName: 'N/A',
            phone: '0000000000'
        });
        console.log('Default admin initialized: majestichps@gmail.com / admin123');
    }
});

const db = {
    run: (sql, params, cb) => {
        const callback = typeof params === 'function' ? params : cb;
        const actualParams = typeof params === 'function' ? [] : params;

        if (sql.includes('INSERT INTO users')) {
            const newUser = {
                id: usersStore.length + 1,
                name: actualParams[0],
                class: actualParams[1],
                parentName: actualParams[2],
                phone: actualParams[3],
                email: actualParams[4],
                password: actualParams[5],
                role: actualParams[6] || 'student'
            };
            
            // Check for unique email
            if (usersStore.find(u => u.email === newUser.email)) {
                if (callback) callback({ message: 'UNIQUE constraint failed: email' });
                return;
            }
            
            usersStore.push(newUser);
            if (callback) callback.call({ lastID: newUser.id }, null);
        } else if (sql.includes('UPDATE users')) {
            const [name, sClass, pName, phone, email, role, id] = actualParams;
            const index = usersStore.findIndex(u => u.id == id);
            if (index !== -1) {
                usersStore[index] = { ...usersStore[index], name, class: sClass, parentName: pName, phone, email, role };
            }
            if (callback) callback(null);
        } else if (sql.includes('DELETE FROM users')) {
            const id = actualParams[0];
            const index = usersStore.findIndex(u => u.id == id);
            if (index !== -1) usersStore.splice(index, 1);
            if (callback) callback(null);
        } else {
            if (callback) callback(null);
        }
    },
    get: (sql, params, cb) => {
        const callback = typeof params === 'function' ? params : cb;
        const actualParams = typeof params === 'function' ? [] : params;

        if (sql.includes('FROM users WHERE email = ?')) {
            const email = actualParams[0];
            const roleMatch = sql.includes('role = "student"') ? 'student' : (sql.includes('role = "admin"') ? 'admin' : null);
            
            const user = usersStore.find(u => u.email === email && (!roleMatch || u.role === roleMatch));
            if (callback) callback(null, user || null);
        } else {
            if (callback) callback(null, null);
        }
    },
    all: (sql, params, cb) => {
        const callback = typeof params === 'function' ? params : cb;
        if (sql.includes('FROM users')) {
            if (callback) callback(null, [...usersStore]);
        } else {
            if (callback) callback(null, []);
        }
    },
    prepare: () => ({ run: () => {}, finalize: () => {} })
};
console.log('Using In-Memory Database for preview stability.');

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).json({ error: 'Forbidden: Admins only' });
};

// Routes

// 0. Download Annual Report PDF
app.get('/api/download-report', async (req, res) => {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 850]); // Standard tall format
        const { width, height } = page.getSize();
        
        const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Colors
        const primaryColor = rgb(30 / 255, 58 / 255, 138 / 255); // var(--report-blue)
        const accentColor = rgb(250 / 255, 204 / 255, 21 / 255); // var(--report-gold)
        const darkColor = rgb(15 / 255, 23 / 255, 42 / 255);
        const lightGray = rgb(241 / 255, 245 / 255, 249 / 255);
        const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);

        // Header Banner Background
        page.drawRectangle({
            x: 0,
            y: height - 140,
            width: width,
            height: 140,
            color: primaryColor,
        });

        // Yellow Accent bar
        page.drawRectangle({
            x: 0,
            y: height - 145,
            width: width,
            height: 5,
            color: accentColor,
        });

        // Banner Text
        page.drawText('MAJESTIC PRIMARY AND HIGH SCHOOL', {
            x: 40,
            y: height - 55,
            size: 20,
            font: fontBold,
            color: rgb(1, 1, 1),
        });

        page.drawText('ANNUAL INSTITUTIONAL REPORT  |  2024-25', {
            x: 40,
            y: height - 85,
            size: 11,
            font: fontBold,
            color: accentColor,
        });

        page.drawText('Mysuru, Karnataka, India  |  majestichps@gmail.com', {
            x: 40,
            y: height - 110,
            size: 9,
            font: fontSans,
            color: rgb(0.9, 0.9, 0.9),
        });

        // Document Details Box
        page.drawRectangle({
            x: 40,
            y: height - 240,
            width: width - 80,
            height: 75,
            color: lightGray,
        });

        page.drawText('REPORT METRICS & EXECUTIVE OVERVIEW', {
            x: 55,
            y: height - 185,
            size: 11,
            font: fontBold,
            color: primaryColor,
        });

        const details = [
            'Academic Pass Rate: 100% (Secondary Boards)',
            'Enrolled Students: 1,200+ Daily Learners',
            'Full-Time Expert Educators: 50+ Mentors',
            'Institutional Legacy: 25 Years of Excellence (Est. 2001)'
        ];

        let detailY = height - 205;
        for (let i = 0; i < details.length; i++) {
            const isLeft = i % 2 === 0;
            const x = isLeft ? 55 : 300;
            const y = detailY - Math.floor(i / 2) * 20;
            page.drawText('• ' + details[i], {
                x: x,
                y: y,
                size: 9,
                font: fontSans,
                color: darkColor,
            });
        }

        // Section Title: Executive Insights
        page.drawText('EXECUTIVE STRATEGIC METRICS', {
            x: 40,
            y: height - 275,
            size: 13,
            font: fontBold,
            color: primaryColor,
        });

        // Line below title
        page.drawLine({
            start: { x: 40, y: height - 280 },
            end: { x: width - 40, y: height - 280 },
            thickness: 1,
            color: primaryColor,
        });

        // Insight Items
        const insights = [
            {
                title: '1. Academic Excellence & Board Performance',
                desc: 'An outstanding 98.6% passing average across state examinations, with 42% scoring in the top-tier distinction level. Integrated moral guidance combined with standard curricula proves highly effective.'
            },
            {
                title: '2. Science & Technology Infrastructure',
                desc: 'Upgraded the composite science labs with modern lab equipment, implemented high-speed computer labs for learning, and added 15 interactive smart projection units for digital classrooms.'
            },
            {
                title: '3. Extracurricular Legacy & Co-curricular Events',
                desc: 'Secured top positions in regional debate and sports leagues. Majestic School continues to provide comprehensive training in arts, crafts, and performing disciplines.'
            },
            {
                title: '4. Financial Management & Resource Stewardship',
                desc: 'Maintained strict transparency and optimal budget allocations. Key resources are continuously channeled into student scholarship funds and faculty research grants.'
            }
        ];

        let cursorY = height - 315;
        insights.forEach((item) => {
            // Draw Subtitle
            page.drawText(item.title, {
                x: 40,
                y: cursorY,
                size: 11,
                font: fontBold,
                color: darkColor,
            });
            cursorY -= 15;

            // Draw Paragraph Description
            const words = item.desc.split(' ');
            let line = '';
            const lines = [];
            words.forEach((word) => {
                if ((line + word).length * 5.2 > width - 100) {
                    lines.push(line);
                    line = word + ' ';
                } else {
                    line += word + ' ';
                }
            });
            lines.push(line);

            lines.forEach((l) => {
                page.drawText(l.trim(), {
                    x: 55,
                    y: cursorY,
                    size: 9.5,
                    font: fontSans,
                    color: textMuted,
                });
                cursorY -= 14;
            });
            cursorY -= 12; // Gap between sections
        });

        // Footer block in report
        page.drawRectangle({
            x: 40,
            y: 50,
            width: width - 80,
            height: 90,
            color: lightGray,
        });

        page.drawText('INSTITUTIONAL PLEDGE & SIGNATURES', {
            x: 55,
            y: 120,
            size: 10,
            font: fontBold,
            color: primaryColor,
        });

        page.drawText('This document is certified by the Board of Directors of Majestic Primary and High School.', {
            x: 55,
            y: 105,
            size: 8.5,
            font: fontSans,
            color: textMuted,
        });

        page.drawText('Mrs. Sumaiya Kowsar', {
            x: 55,
            y: 75,
            size: 9.5,
            font: fontBold,
            color: darkColor,
        });
        page.drawText('Principal, Majestic School', {
            x: 55,
            y: 63,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        page.drawText('Mr. Arif Sir', {
            x: 350,
            y: 75,
            size: 9.5,
            font: fontBold,
            color: darkColor,
        });
        page.drawText('Chairman, Majestic School', {
            x: 350,
            y: 63,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        // Document Footer Annotation
        page.drawText('Page 1 of 1  |  Generated Dynamically under Board Supervision', {
            x: width / 2 - 150,
            y: 25,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-disposition', 'attachment; filename=Majestic_Annual_Report_2024-25.pdf');
        res.setHeader('Content-type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('Failed to generate PDF:', err);
        res.status(500).json({ error: 'Failed to generate report PDF' });
    }
});

// 0.5 Download Fee Structure PDF
app.get('/api/download-fee-structure', async (req, res) => {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 850]); // Standard tall format
        const { width, height } = page.getSize();
        
        const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Colors
        const primaryColor = rgb(15 / 255, 31 / 255, 63 / 255); // var(--primary-blue)
        const accentColor = rgb(250 / 255, 204 / 255, 21 / 255); // gold/yellow
        const darkColor = rgb(15 / 255, 23 / 255, 42 / 255);
        const lightGray = rgb(248 / 255, 250 / 255, 252 / 255);
        const borderGray = rgb(226 / 255, 232 / 255, 240 / 255);
        const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);

        // Header Background Banner
        page.drawRectangle({
            x: 0,
            y: height - 130,
            width: width,
            height: 130,
            color: primaryColor,
        });

        // Accent Gold bar
        page.drawRectangle({
            x: 0,
            y: height - 135,
            width: width,
            height: 5,
            color: accentColor,
        });

        // Banner Branding Text
        page.drawText('MAJESTIC PRIMARY & HIGH SCHOOL', {
            x: 40,
            y: height - 55,
            size: 18,
            font: fontBold,
            color: rgb(1, 1, 1),
        });

        page.drawText('OFFICIAL ACADEMIC FEE STRUCTURE  |  2026-27', {
            x: 40,
            y: height - 82,
            size: 11,
            font: fontBold,
            color: accentColor,
        });

        page.drawText('Aziz Sait Road, Mysuru, Karnataka  |  majestichps@gmail.com  |  +91 78920 53860', {
            x: 40,
            y: height - 105,
            size: 8.5,
            font: fontSans,
            color: rgb(0.9, 0.9, 0.9),
        });

        // Document Details Box
        page.drawRectangle({
            x: 40,
            y: height - 215,
            width: width - 80,
            height: 65,
            color: lightGray,
            borderColor: borderGray,
            borderWidth: 1,
        });

        page.drawText('INSTITUTIONAL INFORMATION & TRANSACTION GUIDELINE', {
            x: 55,
            y: height - 175,
            size: 10,
            font: fontBold,
            color: primaryColor,
        });

        const guideTexts = [
            'Payment Schedule: Convenient 3-Installment Plan.',
            'Installment Months: 1st (Admission), 2nd (October), 3rd (January).',
            'Zero Hidden charges: Complete transparent tuition & operation fee.',
            'Payment Channels: Supports Bank Draft, Online RTGS/UPI, Counter Cash.'
        ];

        let textY = height - 192;
        for (let i = 0; i < guideTexts.length; i++) {
            const isLeft = i % 2 === 0;
            const x = isLeft ? 55 : 310;
            const y = textY - Math.floor(i / 2) * 15;
            page.drawText('• ' + guideTexts[i], {
                x: x,
                y: y,
                size: 8,
                font: fontSans,
                color: darkColor,
            });
        }

        // Section Title: Fee Structure Table
        page.drawText('APPROVED ACADEMIC FEE LAYOUT (2026-27)', {
            x: 40,
            y: height - 245,
            size: 11,
            font: fontBold,
            color: primaryColor,
        });

        page.drawLine({
            start: { x: 40, y: height - 250 },
            end: { x: width - 40, y: height - 250 },
            thickness: 1,
            color: primaryColor,
        });

        // Table Header
        const headers = ['Grades/Class', 'Total Fee', '1st Inst.', '2nd (Oct)', '3rd (Jan)'];
        const colWidths = [120, 100, 100, 100, 100];
        const startX = 40;
        let cursorY = height - 275;

        // Draw header row
        page.drawRectangle({
            x: startX,
            y: cursorY - 5,
            width: width - 80,
            height: 25,
            color: primaryColor,
        });

        let currentX = startX;
        headers.forEach((h, index) => {
            page.drawText(h, {
                x: currentX + 10,
                y: cursorY + 5,
                size: 9,
                font: fontBold,
                color: rgb(1, 1, 1),
            });
            currentX += colWidths[index];
        });

        // Fee Rows Data
        const feeRows = [
            { grades: 'PRE-KG', total: 'INR 11,000', inst1: 'INR 6,000', inst2: 'INR 2,500', inst3: 'INR 2,500' },
            { grades: 'L.K.G', total: 'INR 14,000', inst1: 'INR 8,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'U.K.G', total: 'INR 14,000', inst1: 'INR 8,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class I', total: 'INR 16,000', inst1: 'INR 10,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class II', total: 'INR 16,000', inst1: 'INR 10,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class III', total: 'INR 16,000', inst1: 'INR 10,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class IV', total: 'INR 16,000', inst1: 'INR 10,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class V', total: 'INR 16,000', inst1: 'INR 10,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class VI', total: 'INR 17,000', inst1: 'INR 12,000', inst2: 'INR 2,500', inst3: 'INR 2,500' },
            { grades: 'Class VII', total: 'INR 17,000', inst1: 'INR 12,000', inst2: 'INR 2,500', inst3: 'INR 2,500' },
            { grades: 'Class VIII', total: 'INR 18,000', inst1: 'INR 12,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class IX', total: 'INR 18,000', inst1: 'INR 12,000', inst2: 'INR 3,000', inst3: 'INR 3,000' },
            { grades: 'Class X', total: 'INR 20,000', inst1: 'INR 12,000', inst2: 'INR 4,000', inst3: 'INR 4,000' }
        ];

        cursorY -= 25;
        feeRows.forEach((row, rowIndex) => {
            // Draw alternating background row colors
            if (rowIndex % 2 === 1) {
                page.drawRectangle({
                    x: startX,
                    y: cursorY - 5,
                    width: width - 80,
                    height: 25,
                    color: lightGray,
                });
            }
            // Draw border line below row
            page.drawLine({
                start: { x: startX, y: cursorY - 5 },
                end: { x: width - 40, y: cursorY - 5 },
                thickness: 0.5,
                color: borderGray,
            });

            let colX = startX;
            // Grades
            page.drawText(row.grades, { x: colX + 10, y: cursorY + 5, size: 9, font: fontBold, color: darkColor });
            colX += colWidths[0];
            // Total
            page.drawText(row.total, { x: colX + 10, y: cursorY + 5, size: 9, font: fontBold, color: primaryColor });
            colX += colWidths[1];
            // Inst1
            page.drawText(row.inst1, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontSans, color: darkColor });
            colX += colWidths[2];
            // Inst2
            page.drawText(row.inst2, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontSans, color: darkColor });
            colX += colWidths[3];
            // Inst3
            page.drawText(row.inst3, { x: colX + 10, y: cursorY + 5, size: 8.5, font: fontSans, color: darkColor });

            cursorY -= 25;
        });

        // Add Notes Section
        cursorY -= 15;
        page.drawText('IMPORTANT UNDERTAKINGS & POLICIES', {
            x: 40,
            y: cursorY,
            size: 10,
            font: fontBold,
            color: primaryColor,
        });

        page.drawLine({
            start: { x: 40, y: cursorY - 5 },
            end: { x: width - 40, y: cursorY - 5 },
            thickness: 0.5,
            color: primaryColor,
        });

        const policyNotes = [
            '1. Deadlines: 1st Installment at admission time. 2nd Installment by Oct 15. 3rd Installment by Jan 15.',
            '2. Fine policy: Reasonable late fee charge of Rs. 10 per day is collected after the respective grace periods.',
            '3. Refund: Under uniform regulations, the fees paid during admission intakes are non-refundable.',
            '4. Verification: Receipts are printed and stamped directly. Retain receipts for proof of completion.'
        ];

        cursorY -= 20;
        policyNotes.forEach((note) => {
            page.drawText(note, {
                x: 40,
                y: cursorY,
                size: 8,
                font: fontSans,
                color: darkColor,
            });
            cursorY -= 14;
        });

        // Signatures area
        cursorY -= 15;
        page.drawLine({
            start: { x: 40, y: cursorY },
            end: { x: 190, y: cursorY },
            thickness: 0.5,
            color: textMuted,
        });

        page.drawLine({
            start: { x: 410, y: cursorY },
            end: { x: 560, y: cursorY },
            thickness: 0.5,
            color: textMuted,
        });

        cursorY -= 12;
        page.drawText('Account Supervisor Center', {
            x: 45,
            y: cursorY,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        page.drawText('Chairman Signatory Authority', {
            x: 415,
            y: cursorY,
            size: 8,
            font: fontSans,
            color: textMuted,
        });

        // Document Footer Annotation
        page.drawText('Official Majestic School Document  |  Generated Dynamically under Board Supervision', {
            x: width / 2 - 180,
            y: 20,
            size: 7.5,
            font: fontSans,
            color: textMuted,
        });

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-disposition', 'attachment; filename=Majestic_School_Fee_Structure_2026-27.pdf');
        res.setHeader('Content-type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('Failed to generate PDF:', err);
        res.status(500).json({ error: 'Failed to generate fee structure PDF' });
    }
});

// 1. Signup (Student/Parent)
app.post('/api/signup', (req, res) => {
    const { name, class: studentClass, parentName, phone, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, Email, and Password are required' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Error hashing password' });

        const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        const sql = `INSERT INTO users (name, class, parentName, phone, email, password, role) VALUES (?, ?, ?, ?, ?, ?, 'student')`;
        db.run(sql, [name, studentClass, parentName, phone, email, hash], function(err) {
            if (err) {
                if(err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Send OTP via email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify Your Email - Majestic School',
                text: `Dear ${name},\n\nYour OTP for email verification is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nRegards,\nMajestic School Team`
            };
            
            let emailSent = false;
            let smsSent = false;
            
            // Try to send email
            if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-email@gmail.com') {
                transporter.sendMail(mailOptions, (err, info) => {
                    if (!err) {
                        console.log('OTP sent via email:', otp);
                        emailSent = true;
                    } else {
                        console.error('Email error:', err);
                    }
                });
            }

            // Try to send SMS if phone provided
            if (phone && process.env.TWILIO_SID && process.env.TWILIO_SID !== 'your-twilio-sid') {
                const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
                twilioClient.messages.create({
                    body: `Majestic School: Your OTP is ${otp}. Valid for 10 minutes.`,
                    from: process.env.TWILIO_PHONE,
                    to: phone
                }).then(message => {
                    console.log('OTP sent via SMS:', otp);
                    smsSent = true;
                }).catch(err => {
                    console.error('SMS error:', err);
                });
            }

            // Always return success, even if notifications fail
            res.status(201).json({ 
                message: 'Registration successful! Please check your email/SMS for OTP.', 
                id: this.lastID,
                notifications: { email: emailSent, sms: smsSent }
            });
        });
    });
});

// 2. Login (Student/Parent)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ? AND role = "student"', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(401).json({ error: 'Invalid email or password' });

        bcrypt.compare(password, row.password, (err, result) => {
            if (result) {
                req.session.user = { id: row.id, name: row.name, role: row.role };
                res.json({ message: 'Login successful', user: req.session.user });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        });
    });
});

// 3. Admin Login
app.post('/api/admin-login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ? AND role = "admin"', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(401).json({ error: 'Invalid admin email or password' });

        bcrypt.compare(password, row.password, (err, result) => {
            if (result) {
                req.session.user = { id: row.id, name: row.name, role: row.role };
                res.json({ message: 'Admin login successful', user: req.session.user });
            } else {
                res.status(401).json({ error: 'Invalid admin email or password' });
            }
        });
    });
});

// 4. Logout (Support both POST and GET)
app.use('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out successfully' });
    });
});

// 5. Get Session Info
app.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Admin Routes

// Get all users
app.get('/api/users', isAdmin, (req, res) => {
    db.all('SELECT id, name, class, parentName, phone, email, role FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Edit user
app.put('/api/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { name, class: studentClass, parentName, phone, email, role } = req.body;
    
    db.run(
        'UPDATE users SET name=?, class=?, parentName=?, phone=?, email=?, role=? WHERE id=?',
        [name, studentClass, parentName, phone, email, role, id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'User updated successfully' });
        }
    );
});

// Delete user
app.delete('/api/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM users WHERE id=?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'User deleted successfully' });
    });
});

// Forgot Password
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Email not found' });

        // Generate a simple reset token (in production, use JWT or secure token)
        const resetToken = Math.random().toString(36).substring(2);
        
        // In production, store token in DB with expiry
        // For demo, just send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset - Majestic School',
            text: `Dear ${row.name},\n\nYou requested a password reset. Click here to reset: http://localhost:${PORT}/reset-password?token=${resetToken}&email=${email}\n\nIf you didn't request this, ignore this email.\n\nRegards,\nMajestic School Team`
        };
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Email error:', err);
                return res.status(500).json({ error: 'Error sending email' });
            }
            res.json({ message: 'Reset link sent to your email' });
        });
    });
});

// Reset Password
app.post('/api/reset-password', (req, res) => {
    const { email, token, password } = req.body;
    
    // In production, verify token from DB
    // For demo, just update password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Error hashing password' });

        db.run('UPDATE users SET password=? WHERE email=?', [hash, email], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Password reset successfully' });
        });
    });
});

// Verify Email
app.post('/api/verify-email', (req, res) => {
    const { email, otp } = req.body;
    
    // In production, check OTP from DB
    // For demo, accept any 6-digit OTP
    if (otp.length === 6 && /^\d+$/.test(otp)) {
        res.json({ message: 'Email verified successfully' });
    } else {
        res.status(400).json({ error: 'Invalid OTP' });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
