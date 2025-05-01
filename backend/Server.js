require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const twilio = require('twilio');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS
app.use(bodyParser.urlencoded({ extended: true })); // Add this line to parse form data

mongoose.connect("mongodb+srv://sahil:%24AHIL_sawant07@wikipedia.dajnn.mongodb.net/wikipedia?retryWrites=true&w=majority")
    .then(() => {
        console.log("MongoDB Connected Successfully");
        console.log("Database Name:", mongoose.connection.db.databaseName);
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
    });

const bookingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    services: [{ type: String, required: true }],
    totalPrice: { type: Number, required: true },
    paymentId: { type: String },
    orderId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Create a compound index for date and time to ensure uniqueness
bookingSchema.index({ date: 1, time: 1 }, { unique: true });

// Add feedback schema
const feedbackSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: 'rzp_test_yE897zxuogkm3U', // Replace with your test key ID
    key_secret: 'ZvXL8jIsOzCBw8UiKexZYEpI' // Replace with your test key secret
});

// Initialize Twilio client
const twilioClient = require('twilio')(
    'AC52f82d330d27207f160f33b5d36a9c17',
    '9b61d7f62b219b825a8070f4f4042707',
    { apiKey: 'SK0cfbb4adfcd63c733a7c09a0e301a68b' }
);

// Create order
app.post('/create-order', async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100, // Convert to paise
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        };

        console.log('Creating Razorpay order with options:', options);
        const order = await razorpay.orders.create(options);
        console.log('Order created successfully:', order);
        
        res.json({ orderId: order.id });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ 
            message: 'Error creating order',
            error: error.message 
        });
    }
});

// Check slot availability
app.get('/check-availability', async (req, res) => {
    try {
        const { date, time } = req.query;
        
        // Check if slot is already booked in MongoDB
        const existingBooking = await Booking.findOne({ date, time });
        
        if (existingBooking) {
            res.json({ 
                available: false,
                message: `This time slot (${time} on ${date}) is already booked. Please select a different time or date.`
            });
        } else {
            res.json({ 
                available: true,
                message: 'Time slot is available'
            });
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ 
            available: false,
            message: 'Error checking availability. Please try again.' 
        });
    }
});

// Send WhatsApp notification
app.post('/send-whatsapp', async (req, res) => {
    try {
        const {
            name,
            email,
            date,
            time,
            services,
            totalPrice
        } = req.body;

        // Send WhatsApp notification
        await twilioClient.messages.create({
            from: 'whatsapp:+14155238886',
            contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
            contentVariables: JSON.stringify({
                "1": name,
                "2": date,
                "3": time,
                "4": services.join(', '),
                "5": `₹${totalPrice}`
            }),
            to: 'whatsapp:+918104448401'
        });
        
        console.log('WhatsApp notification sent successfully');
        res.json({ message: 'WhatsApp notification sent successfully' });
    } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
        res.status(500).json({ message: 'Error sending WhatsApp notification' });
    }
});

// Create booking after successful payment
app.post('/book', async (req, res) => {
    try {
        console.log('\n=== Starting Booking Process ===');
        console.log('Request headers:', req.headers);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const {
            name,
            email,
            date,
            time,
            services,
            totalPrice,
            paymentId,
            orderId
        } = req.body;

        // Log all received data
        console.log('\nReceived booking data:');
        console.log('- Name:', name);
        console.log('- Email:', email);
        console.log('- Date:', date);
        console.log('- Time:', time);
        console.log('- Services:', services);
        console.log('- Total Price:', totalPrice);
        console.log('- Payment ID:', paymentId);
        console.log('- Order ID:', orderId);

        // Check MongoDB connection
        console.log('\nChecking MongoDB connection...');
        console.log('MongoDB connection state:', mongoose.connection.readyState);
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB is not connected!');
            return res.status(500).json({ message: 'Database connection error' });
        }
        console.log('MongoDB connection is active');

        // Check if slot is still available
        console.log('\nChecking slot availability...');
        console.log('Searching for existing booking with date:', date, 'and time:', time);
        const existingBooking = await Booking.findOne({ date, time });
        if (existingBooking) {
            console.log('Slot already booked:', existingBooking);
            return res.status(400).json({ message: 'This slot is no longer available' });
        }
        console.log('Slot is available');

        // Create booking
        console.log('\nCreating new booking...');
        const booking = new Booking({
            name,
            email,
            date,
            time,
            services,
            totalPrice,
            paymentId,
            orderId
        });

        console.log('Attempting to save booking to database...');
        try {
            await booking.save();
            console.log('Booking saved successfully!');
        } catch (saveError) {
            console.error('Error saving booking:', saveError);
            throw saveError;
        }

        // Verify the booking was saved
        console.log('\nVerifying saved booking...');
        const savedBooking = await Booking.findOne({ date, time });
        console.log('Verified saved booking:', savedBooking);

        console.log('\n=== Booking Process Completed Successfully ===\n');

        res.json({ 
            message: 'Booking successful',
            booking: savedBooking
        });
    } catch (error) {
        console.error('\n=== Booking Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=== End Error ===\n');
        
        res.status(500).json({ 
            message: 'Error creating booking',
            error: error.message 
        });
    }
});

// Update the feedback route to handle form data
app.post('/submit-feedback', async (req, res) => {
    try {
        console.log('Received feedback submission:', req.body);
        
        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB is not connected. Connection state:', mongoose.connection.readyState);
            return res.status(500).json({ 
                success: false, 
                message: 'Database connection error. Please try again later.' 
            });
        }
        
        const { name, email, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            console.log('Missing required fields:', { name, email, subject, message });
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        const feedback = new Feedback({
            name,
            email,
            subject,
            message
        });

        console.log('Attempting to save feedback to database...');
        await feedback.save();
        console.log('Feedback saved successfully:', feedback);
        
        res.json({ 
            success: true, 
            message: 'Feedback submitted successfully',
            feedback: feedback
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting feedback',
            error: error.message 
        });
    }
});

app.get('/get-feedback', async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .sort({ createdAt: -1 })
            .limit(10); // Get the 10 most recent feedbacks
        
        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Error fetching feedback' });
    }
});

// Add error handler for MongoDB connection
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected');
});

// Add reconnection logic
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
    mongoose.connect("mongodb+srv://sahil:%24AHIL_sawant07@wikipedia.dajnn.mongodb.net/wikipedia?retryWrites=true&w=majority", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }).catch(err => {
        console.error('MongoDB reconnection error:', err);
    });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
