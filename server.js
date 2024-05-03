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

// Route to handle audio file translation
app.post("/translate", async (req, res) => {
  try {
    const text = req.body.text;
    const options = {
      method: "POST",
      url: "https://microsoft-translator-text.p.rapidapi.com/translate",
      params: {
        "to[0]": "en",
        "api-version": "3.0",
        profanityAction: "NoAction",
        textType: "plain",
      },
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": "08a6c56cc0msh2dfa8a53f481237p118c0djsnae7dadfee40e",
        "X-RapidAPI-Host": "microsoft-translator-text.p.rapidapi.com",
      },
      data: [
        {
          Text: text,
        },
      ],
    };
    const response = await axios.request(options);
    const translation = response.data[0].translations;
    res.json({ translation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

// Route to handle audio file aromanization
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

const chatHistory = [];

// Route to handle chat completion
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    chatHistory.push({ role: "user", content: userMessage });

    let systemMessage = "";

    if (chatHistory.length === 1) {
      // Call OpenAI API with introduction message to prompt the chatbot
      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: generateIntroductionMessage() }],
        model: "gpt-3.5-turbo-0125",
      });

      // Retrieve the system's response from OpenAI
      systemMessage = completion.choices[0].message;
    } else {
      // Call OpenAI API to generate a response based on the conversation history
      const completion = await openai.chat.completions.create({
        messages: chatHistory,
        model: "gpt-3.5-turbo-0125",
      });

      // Retrieve the system's response from OpenAI
      systemMessage = completion.choices[0].message;
    }

    // Send the system's response back to the client
    res.json({ response: systemMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to complete text" });
  }
});

// Function to generate introduction message
function generateIntroductionMessage() {
  const language = "Korean";
  const teacherName = "Oppa";
  const userName = "Haris";
  const level = "Beginner";
  const userLanguage = "English";

  const introductionMessage = `You are a ${language} teacher named ${teacherName}. 
    You are on a 1-on-1 session with your student, ${userName}. ${userName}'s 
    ${language} level is: ${level}.
    Your task is to assist your student in advancing their ${language}.
    * When the session begins, offer a suitable session for ${userName}, unless
    asked for something else.
    * ${userName}'s native language is ${userLanguage}. ${userName} might 
    address you in their own language when felt their ${language} is not well 
    enough. When that happens, first translate their message to ${language}, 
    and then reply.
    * Ensure that your response is short and concise with a maximum of 20 tokens.
    * Can you start the first conversation by asking "Hello, How are you today?"
    * IMPORTANT: If your student makes any mistakes, be it typo or grammar, 
    you MUST first correct your student and only then reply.
    * You are only allowed to speak ${language}.`;

  return introductionMessage;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
