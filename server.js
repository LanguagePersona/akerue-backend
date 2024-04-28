const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");
const fs = require("fs");
const aromanize = require("aromanize");
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

// Route to handle audio file transcription
app.post("/translate", async (req, res) => {
  try {
    const body = req.body;
    const encodedParams = new URLSearchParams();
    encodedParams.set("q", body.q);
    encodedParams.set("target", body.target);
    encodedParams.set("source", body.source);
    console.log(encodedParams);
    const options = {
      method: "POST",
      url: "https://google-translate1.p.rapidapi.com/language/translate/v2",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "application/gzip",
        "X-RapidAPI-Key": "08a6c56cc0msh2dfa8a53f481237p118c0djsnae7dadfee40e",
        "X-RapidAPI-Host": "google-translate1.p.rapidapi.com",
      },
      data: encodedParams,
    };

    const response = await axios.request(options);
    const data = response.data.data.translations;
    res.json({
      translatedText: data[0].translatedText,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

// Route to handle audio file transcription
app.post("/aromanize", async (req, res) => {
  try {
    const body = req.body;
    const aromanizeText = aromanize.romanize(body.text);

    res.json({
      text: aromanizeText,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to aromanize text" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
