const express = require("express");
const morgan = require("morgan");
const twilio = require("twilio");
const dotenv = require("dotenv");
const connectToDb = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cors = require("cors");
const path = require("path");

// configing the dotenv file
dotenv.config();

// rest object
const app = express();

// creating the middleware
app.use(cors());

// Parse URL-encoded bodies (e.g., form data)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(authMiddleware)
app.use(morgan("dev"));

// connection to database
connectToDb();

// below we are creating the routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);

//static files
app.use(express.static(path.join(__dirname, "./client/build")));

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

//adding new
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.post("/send-sos", async (req, res) => {
  const { sender, receivers, message, latitude, longitude } = req.body;
  let failedMessages = [];
  let successfulMessages = [];

  // Create a Google Maps location link
  const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const fullMessage = `${message}\nMy location: ${locationLink}`;

  for (let receiver of receivers) {
    try {
      // Format the receiver's phone number for WhatsApp
      const formattedReceiver = `whatsapp:+91${receiver}`;

      const response = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: formattedReceiver,
        body: `SOS from ${sender}: ${fullMessage}`,
      });

      successfulMessages.push(receiver);
      console.log(`Message sent to ${receiver}: ${response.sid}`);
    } catch (error) {
      failedMessages.push({
        receiver,
        error: error.message,
        moreInfo: error.moreInfo,
      });
      console.error(`Failed to send message to ${receiver}: ${error.message}`);
    }
  }

  if (failedMessages.length > 0) {
    return res.status(400).json({
      message: "Some messages failed to send.",
      failedMessages,
      successfulMessages,
    });
  }

  res.status(200).json({
    message: "All SOS messages sent successfully!",
    successfulMessages,
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`server is running in ${process.env.MODE}on the port ${8080}`);
});
