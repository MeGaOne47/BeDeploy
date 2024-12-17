const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

dotenv.config();

// Sử dụng middleware CORS
app.use(cors());

const BUCKET_NAME = process.env.BUCKET_NAME;
const s3 = new aws.S3({
    secretAccessKey: process.env.ACCESS_SECRET,
    accessKeyId: process.env.ACCESS_KEY,
    region: process.env.REGION,
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, file.originalname);
        }
    })
});

app.get("/view/:filename", async (req, res) => {
    const filename = req.params.filename;
    const key = filename; // Tên file trong bucket

    try {
        // Lấy file từ S3
        const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();

        // Xác định Content-Type dựa trên loại file
        let contentType;
        if (filename.endsWith('.png')) {
            contentType = 'image/png';
        } else if (filename.endsWith('.pdf')) {
            contentType = 'application/pdf';
        } else {
            contentType = 'application/octet-stream'; // Loại file không xác định
        }

        // Gửi file trực tiếp với đúng Content-Type
        res.set('Content-Type', contentType);
        res.send(data.Body);
    } catch (error) {
        console.error(error);
        res.status(404).send("File Not Found");
    }
});


app.post('/upload', upload.single('file'), async function (req, res, next) {
    res.send('Successfully uploaded ' + req.file.location + ' location!');
});

app.get("/list", async (req, res) => {
    try {
        let r = await s3.listObjectsV2({ Bucket: BUCKET_NAME }).promise();
        let x = r.Contents.map(item => item.Key);
        res.send(x);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/download/:filename", async (req, res) => {
    const filename = req.params.filename;
    try {
        let x = await s3.getObject({ Bucket: BUCKET_NAME, Key: filename }).promise();
        res.send(x.Body);
    } catch (error) {
        console.error(error);
        res.status(404).send("File Not Found");
    }
});

app.get("/download/:folder/:filename", async (req, res) => {
    const folder = req.params.folder;
    const filename = req.params.filename;
    const key = folder + '/' + filename; // Tạo key cho tên file trong thư mục
    const downloadUrl = `https://hung1.s3.ap-southeast-2.amazonaws.com/${key}`; // Đường dẫn của hình ảnh trên S3 bucket

    try {
        let x = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();
        res.set('Content-Type', 'image/png');
        res.send(x.Body);
    } catch (error) {
        console.error(error);
        res.status(404).send("File Not Found");
    }
});

app.delete("/delete/:folder/:filename", async (req, res) => {
    const folder = req.params.folder;
    const filename = req.params.filename;
    const key = folder + '/' + filename; // Tạo key cho tên file trong thư mục

    try {
        await s3.deleteObject({ Bucket: BUCKET_NAME, Key: key }).promise();
        res.send("File Deleted Successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


app.delete("/delete/:filename", async (req, res) => {
    const filename = req.params.filename;
    try {
        await s3.deleteObject({ Bucket: BUCKET_NAME, Key: filename }).promise();
        res.send("File Deleted Successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
