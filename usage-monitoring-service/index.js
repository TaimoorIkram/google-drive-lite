const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { BandwidthUsage } = require('./db'); // Import the BandwidthUsage model from the db module

const app = express();
const port = 3400;

app.use(cors());

const maxBandwidth = 20971520; // 20MBs

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to parse JSON
app.use(express.json());

// Endpoint to retrieve the user's used up bandwidth for the day and return it
app.post('/api/getBandwidthUsed', async (req, res) => {
  try {
    // Extract userId from the request body
    const userId = req.body.userId;

    // Calculate image size
    const requestSize = req.body.imageSize; // size in bytes

    // Get the current date
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    // Aggregate the total bandwidth used by the user for the current day
    const result = await BandwidthUsage.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startOfDay } // Filter records for the current day and beyond
        }
      },
      {
        $group: {
          _id: "$userId",
          totalBandwidthUsed: { $sum: "$requestSize" }
        }
      }
    ]);

    const currentBandwidthUsage = result.length > 0 ? result[0].totalBandwidthUsed : 0;
    console.log(maxBandwidth);
    console.log(currentBandwidthUsage);
    console.log(requestSize);
    console.log("test");
    if ((currentBandwidthUsage + requestSize) > maxBandwidth) {
      console.log('not available');
      res.json({ bandwidthAvailable: false });
    } else {
      console.log('available');
      res.json({ bandwidthAvailable: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Endpoint to receive request to add bandwidth usage record to database
app.post('/api/updateBandwidthUsed', async (req, res) => {
  try{
    const userId = req.body.userId;

    // Calculate image size
    const requestSize = req.body.imageSize; // size in bytes

    // Create a new BandwidthUsage record with the uploaded userId, requestSize, and the current datetime
    const newRecord = new BandwidthUsage({
      userId: userId,
      requestSize: requestSize,
      date: Date.now(),
    });

    // Save the record to MongoDB
    await newRecord.save();
    console.log('saved');
    res.json({db_status: 'updated'});
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to handle requests to the root URL
// app.post('/', (req, res) => {
//   const id = req.body.userId;
//   console.log(id);
//   res.status(200).json({id: id});
// });

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});