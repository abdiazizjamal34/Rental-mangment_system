const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // Import mongoose

require('dotenv').config();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/rental-mangmenr', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useFindAndModify: false,
  // useCreateIndex: true,
}).then(() => console.log('MongoDB Connected...'))
 .catch(err => console.log(err));

// Define Room schema
const RoomSchema = new mongoose.Schema({
  floorNumber: Number,
  roomNumber: Number,
  rentCount: Number,
  rentalInfo: [
    {
      tenantName: String,
      tenantEmail: String,
      tenantRole: String,
      tenantNatinalId: String,
      tenantLicence: String,
      startDate: Date,
      endDate: Date,
      price: Number,
    },
  ],
});








// Room model
const Room = mongoose.model('Room', RoomSchema);

const building = {
  floors: [], // Initialize floors as an empty array
};

// Create rooms for each floor
async function createRooms() {
  for (let floor = 1; floor <= 5; floor++) {
    const rooms = [];
    for (let room = 1; room <= 10; room++) {
      const newRoom = new Room({ floorNumber: floor, roomNumber: room, rentCount: 0, rentalInfo: [] });
      await newRoom.save();
      rooms.push(newRoom);
    }
    building.floors.push(rooms); // Push rooms into building.floors
  }
}


// Initialize the rental management system
createRooms();

// API endpoints

// Get all rooms and their rental status
app.get('/api/rooms', async (req, res) => {
  const rooms = await Room.find();
  res.json(rooms);
  console.log(rooms);
});

// Rent a room
// Rent a room
app.post('/api/rooms/rent', async (req, res) => {
  const { floor, room, tenantName, startDate, endDate, price, tenantEmail ,tenantNatinalId,tenantRole , tenantLicence } = req.body;
 
  const selectedRoom = await Room.findOne({ floorNumber: floor, roomNumber: room });
 
  if (selectedRoom.rentCount > 0) {
     res.status(400).json({ error: 'Room is already rented.' });
  } else {
     const rentalInfo = {
       tenantName,
       tenantEmail,
       tenantRole,
        tenantNatinalId,
        tenantLicence,
       startDate,
       endDate,
       price,
     };
 
     selectedRoom.rentCount++;
     selectedRoom.rentalInfo.push(rentalInfo);
     await selectedRoom.save();
 
     // Email sending logic moved inside the rent endpoint
     const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: "abdiaziz.jamal3414@gmail.com", // replace with actual email
        pass:"tgns ykak imfm isej", // replace with actual password
      }
    });
     const mailOptions = {
       from: "abdiaziz.jamal3414@gmail.com",
       to: tenantEmail, // Use tenantEmail directly from the request body
       subject: 'Room Rental Confirmation',
       html: `<h2>Dear ${tenantName},</h2>
 <p>This email confirms your rental of room in <h5> Floor ${floor} Room ${room} </h5>.</p>
 <h4> start from ${startDate} and end ${endDate} </h4/>
 <p>Thank you for choosing our rental service.</p>
 <a> send an eamil</a>
 `,
     };
 
     transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
         console.error('Error sending email:', error);
         res.status(500).json({ error: 'Error sending email.' });
       } else {
         console.log('Email sent:', info.response);
         res.json({ message: 'Room rented successfully. An email confirmation has been sent.' });
         console.log("rented",selectedRoom);
       }
     });
  }
 });
 

// Release a room
app.post('/api/rooms/release', async (req, res) => {
  const { floor, room } = req.body;

  const selectedRoom = await Room.findOne({ floorNumber: floor, roomNumber: room });

  if (selectedRoom.rentCount > 0) {
    selectedRoom.rentCount--;
    await selectedRoom.save();
    res.json({ message: 'Room released successfully.' });
  } else {
    res.status(400).json({ error: 'Room is not rented.' });
  }
});

// Generate monthly rental report
app.post('/api/reports/monthly', async (req, res) => {
  const { month } = req.body;

  if (!month || isNaN(month)) {
    res.status(400).json({ error: 'Invalid month parameter.' });
    return;
  }

  const selectedMonth = parseInt(month, 10);

  if (selectedMonth < 1 || selectedMonth > 12) {
    res.status(400).json({ error: 'Invalid month value. Month should be between 1 and 12.' });
    return;
  }

  const monthlyReport = {
    month: selectedMonth,
    rentedRooms: 0,
    totalRevenue: 0,
    rooms: [],
  };

  // Iterate through each room and collect rental information for the selected month
  const rooms = await Room.find();
  rooms.forEach(room => {
    const roomInfo = {
      floor: room.floorNumber,
      room: room.roomNumber,
      rentalCount: 0,
      rentalInfo: [],
    };

    room.rentalInfo.forEach(rental => {
      const rentalMonth = new Date(rental.startDate).getMonth() + 1;

      if (rentalMonth === selectedMonth) {
        roomInfo.rentalCount++;
        roomInfo.rentalInfo.push(rental);
        monthlyReport.rentedRooms++;
        monthlyReport.totalRevenue += rental.price;
      }
    });

    monthlyReport.rooms.push(roomInfo);
  });

  res.json(monthlyReport);
  console.log("report",monthlyReport);
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
