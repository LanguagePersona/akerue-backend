const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const OpenAI = require("openai");
const fs = require("fs");
const aromanize = require("aromanize");
const levenshtein = require("fast-levenshtein");
const app = express();
const port = process.env.PORT || 3000;
// Middleware to parse JSON bodies
app.use(bodyParser.json());

// OpenAI API endpoint
const openaiEndpoint = "https://api.openai.com/v1/speech/transcription";

const openai = new OpenAI();
const dialogues = {
  안녕하세요: "안녕하세요 오늘 기분이 어때요?",
  "저는 잘 지내요": "좋아요 오늘 뭐 했어요?",
  "저는 한국어를 배웠어요": "멋지네요 얼마나 배웠어요?",
  "나 단어 백개를 외웠어오. 더 이상 공부 싶지않아":
    "너무 잘 했어요 그럼 내일 뭘 할거여요?",
  "내일 친구를 만나고 쇼핑에 갈려고요": "좋아요. 쇼핑을 좋아 하세요?",
  "그럼요 너무 좋아해요. 너무 좋아서 자주 돈 어버하게 써요":
    "아, 그럼 돈 관리 잘 해야되요. 보통 무엇을 사요?",
  "보통 올리브영에가서 다양한 화장품이너무 많고 예뻐서 그냥 다사요":
    "이렇게 하면 안되잖아. 필요한 것은 사",
  "네, 열심히 할게요.": "올리브영 말고 다른거 뭘 사요?",
  "옷도 많이사긴해요 요즘 한국 브렌드들이 트렌디잖아.":
    "아네 근데 보통 비싸잖아, 그래도 왜 사요?",
  "예쁘고 오빠가 입은 적이 있으니까": "오",
};

const reversedDialogues = {
  "안녕하세요, 시작하겠습니다": "안녕하세요",
  "안녕하세요 오늘 기분이 어때요?": "저는 잘 지내요",
  "좋아요 오늘 뭐 했어요?": "저는 한국어를 배웠어요",
  "멋지네요 얼마나 배웠어요?": "나 단어 백개를 외웠어오. 더 이상 공부 싶지않아",
  "너무 잘 했어요 그럼 내일 뭘 할거여요?": "내일 친구를 만나고 쇼핑에 갈려고요",
  "좋아요. 쇼핑을 좋아 하세요?":
    "그럼요 너무 좋아해요. 너무 좋아서 자주 돈 어버하게 써요",
  "아, 그럼 돈 관리 잘 해야되요. 보통 무엇을 사요?":
    "보통 올리브영에가서 다양한 화장품이너무 많고 예뻐서 그냥 다사요",
  "이렇게 하면 안되잖아. 필요한 것은 사": "네, 열심히 할게요.",
  "올리브영 말고 다른거 뭘 사요?":
    "옷도 많이사긴해요 요즘 한국 브렌드들이 트렌디잖아.",
  "아네 근데 보통 비싸잖아, 그래도 왜 사요?":
    "예쁘고 오빠가 입은 적이 있으니까",
};

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

    const distance = levenshtein.get(
      req.body.correctSentence,
      transcription.text
    );

    const grade = gradePronunciation(distance, req.body.correctSentence.length);

    // Send the transcription back to the client
    res.json({ transcription, distance, grade });
  } catch (error) {
    // If there's an error, send an error response
    console.error("Error transcribing audio:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

function gradePronunciation(distance, correctSentenceLength) {
  const maxDistance = correctSentenceLength; // Maximum possible distance
  const percentage = (1 - distance / maxDistance) * 100;

  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

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

// Route to handle chat completion [AI VERSION]
/*
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
        max_tokens: 15,
      });

      // Retrieve the system's response from OpenAI
      systemMessage = completion.choices[0].message;
    } else {
      // Call OpenAI API to generate a response based on the conversation history
      const completion = await openai.chat.completions.create({
        messages: chatHistory,
        model: "gpt-3.5-turbo-0125",
        max_tokens: 15,
      });

      // Retrieve the system's response from OpenAI
      systemMessage = completion.choices[0].message;
    }

    const aromanizedMessage = aromanize.romanize(systemMessage.content);

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
          Text: systemMessage.content,
        },
      ],
    };
    const response = await axios.request(options);
    const translation = response.data[0].translations;

    // Send the system's response back to the client
    res.json({
      response: systemMessage,
      aromanizedMessage: aromanizedMessage,
      translatedMessage: translation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to complete text" });
  }
});
*/

// Route to handle chat completion [HARD CODE VERSION]
app.post("/chat", async (req, res) => {
  try {
    let userMessage = req.body.message;
    let systemMessage = "";
    if (userMessage === "") {
      systemMessage = "안녕하세요, 시작하겠습니다";
    } else {
      userMessage = findBestMatch(userMessage);
      systemMessage = dialogues[userMessage];
    }

    const aromanizedMessage = aromanize.romanize(systemMessage);

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
          Text: systemMessage,
        },
      ],
    };
    const response = await axios.request(options);
    const translation = response.data[0].translations;

    // Send the system's response back to the client
    res.json({
      response: systemMessage,
      aromanizedMessage: aromanizedMessage,
      translatedMessage: translation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to complete text" });
  }
});

function findBestMatch(input) {
  let bestMatch = null;
  let lowestDistance = Infinity;

  for (const userString in dialogues) {
    if (dialogues.hasOwnProperty(userString)) {
      const distance = levenshtein.get(input, userString);
      if (distance < lowestDistance) {
        lowestDistance = distance;
        bestMatch = userString;
      }
    }
  }

  return bestMatch;
}

// Route to handle suggested response generation [AI VERSION]
/*
app.post("/suggestion", async (req, res) => {
  try {
    const response = req.body.response;
    const numberOfSuggestions = 1;
    const responseMessage = `You are a Korean language tutor. 
    You have just responded to the user with this response ${response}. 
    Now, before the user responses to you, I want you to give the user a suggested response to what you had said, 
    that is appropriate so that the user can have help in practicing the user's conversational Korean. You can ONLY RESPOND IN KOREAN
    Guidelines:
    1. The user's native language is English. If the user uses English, first translate their message to Korean, then reply.
    2. Keep the suggestion short and extremely simple for the user to respond to.
    3. Use simple vocabulary and grammar suitable for a beginner learner.`;

    // Call OpenAI's completion API
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: responseMessage }],
      model: "gpt-3.5-turbo-0125",
      max_tokens: 15,
      n: numberOfSuggestions,
    });
    const suggestedResponse = completion.choices[0].message.content;
    const aromanizedResponse = aromanize.romanize(suggestedResponse);

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
          Text: suggestedResponse,
        },
      ],
    };
    const translatedResponse = await axios.request(options);
    const translation = translatedResponse.data[0].translations;

    res.json({
      suggestions: suggestedResponse,
      translatedResponse: translation[0].text,
      aromanizedResponse: aromanizedResponse,
    });
  } catch (error) {
    console.error("Error generating suggested responses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
*/

app.post("/suggestion", async (req, res) => {
  try {
    const response = req.body.response;
    const numberOfSuggestions = 1;
    console.log(response);
    const suggestedResponse = reversedDialogues[response];

    const aromanizedResponse = aromanize.romanize(suggestedResponse);

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
          Text: suggestedResponse,
        },
      ],
    };
    const translatedResponse = await axios.request(options);
    const translation = translatedResponse.data[0].translations;

    res.json({
      suggestions: suggestedResponse,
      translatedResponse: translation[0].text,
      aromanizedResponse: aromanizedResponse,
    });
  } catch (error) {
    console.error("Error generating suggested responses:", error);
    res.status(500).json({ error: "Internal server error" });
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
  ${language} level is: ${level}. Your task is to assist your student in advancing 
  their ${language} proficiency. 

  Guidelines:
  1. Begin the session by greeting the student in ${language} and asking "How are you today?".
  2. ${userName}'s native language is ${userLanguage}. If ${userName} uses ${userLanguage}, first translate their message to ${language}, then reply.
  3. Keep your responses short, clear, and relevant to the current learning level.
  4. Use simple vocabulary and grammar suitable for a ${level} learner.
  5. Encourage the student to respond in ${language} as much as possible.

  Let's start the conversation in ${language}.`;

  return introductionMessage;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
