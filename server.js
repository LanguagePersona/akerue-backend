const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;
// Middleware to parse JSON bodies
app.use(bodyParser.json());

// OpenAI API endpoint
const openaiEndpoint = "https://api.openai.com/v1/speech/transcription";

const openai = new OpenAI();

// Route to handle audio file transcription
app.post("/transcribe", async (req, res) => {
  // Assuming the audio file is sent as a base64 encoded string in the request body
  try {
    const audioUri = req.body.audioUri;
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioUri),
      model: "whisper-1",
      language: "ko",
    });

    // Send the transcription back to the client
    res.json({ transcription });
  } catch (error) {
    // If there's an error, send an error response
    console.error("Error transcribing audio:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
