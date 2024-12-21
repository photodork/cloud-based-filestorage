const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const upload = multer();
const path = require('path');
const cors = require('cors');


const app = express();
const PORT = 3000;

app.use(cors()); // Enable CORS for all origins

// AWS SDK configuration
AWS.config.update({
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
});

const s3 = new AWS.S3();
const BUCKET_NAME = '';

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const params = {
            Bucket: BUCKET_NAME,
            Key: req.file.originalname, // Use the original file name
            Body: req.file.buffer,
        };

        const uploadResult = await s3.upload(params).promise();
        res.status(200).json({
            message: 'File uploaded successfully.',
            url: uploadResult.Location,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'File upload failed.', error: error.message });
    }
});

app.get('/files', async (req, res) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
        };

        const data = await s3.listObjectsV2(params).promise();
        const files = await Promise.all(data.Contents.map(async (file) => {
            const url = await s3.getSignedUrlPromise('getObject', {
                Bucket: BUCKET_NAME,
                Key: file.Key,
                Expires: 60 * 60, // URL expires in 1 hour
            });
            return {
                name: file.Key,
                url,
            };
        }));

        res.status(200).json(files);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ message: 'Could not retrieve files.', error: error.message });
    }
});

// Handle file deletion
app.delete('/delete/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: fileName, // The name of the file to delete
        };

        // Delete the file from S3
        await s3.deleteObject(params).promise();
        res.status(200).json({ message: `File ${fileName} deleted successfully.` });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'File deletion failed.', error: error.message });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
