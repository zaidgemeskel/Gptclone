import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==========================
// GET CONVERSATIONS
// ==========================
export async function getConversationsService(limit = 5) {
  try {
    const parsedLimit = Number.parseInt(limit, 10);

    const safeLimit =
      !Number.isInteger(parsedLimit) || parsedLimit <= 0 ? 20 : parsedLimit;

    const [rows] = await db.query(
      `
      SELECT id, role, content, token_count, created_at
      FROM Conversation
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [safeLimit],
    );

    return rows.reverse();
  } catch (error) {
    throw error;
  }
}

// ==========================
// GET MESSAGE BY ID
// ==========================
const getMessageById = async (messageId) => {
  const [rows] = await db.query(
    `
    SELECT id, role, content, token_count, created_at
    FROM Conversation
    WHERE id = ?
    LIMIT 1
    `,
    [messageId],
  );

  if (!rows[0]) return null;

  return {
    id: rows[0].id,
    role: rows[0].role,
    content: rows[0].content,
    tokenCount: Number(rows[0].token_count || 0),
    createdAt: rows[0].created_at,
  };
};

// ==========================
// GEMINI AI RESPONSE
// ==========================
const getAssistantAnswer = async ({ historyRow, question }) => {
  const formattedHistory = historyRow.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));

  const chat = await ai.chats.create({
    model: GEMINI_MODEL,
    config: {
      maxOutputTokens: 1024,
    },
    systemInstruction: `
       You are a software-focused AI assistant. Only answer questions related to programming, software engineering, computer science, web development, IT, APIs, databases, and technology. Politely refuse unrelated questions and redirect the user back to software-related topics.`,
    history: formattedHistory,
  });

  const response = await chat.sendMessage({
    message: question,
  });

  return {
    text: response.text,
    totalTokens: response.usageMetadata?.totalTokenCount || 0,
  };
};

// ==========================
// CREATE CONVERSATION
// ==========================
export async function createConversationService(question) {
  try {
    // validation
    if (!question || !question.trim()) {
      const error = new Error("Question is required");
      error.status = 400;
      throw error;
    }

    // 1. Save user message first
    const [userInsert] = await db.query(
      `INSERT INTO Conversation(content, role) VALUES(?, 'user')`,
      [question],
    );

    // 2. Get updated history AFTER saving user message
    const historyRow = await getConversationsService(5);

    // 3. Get AI response
    const { text, totalTokens } = await getAssistantAnswer({
      historyRow,
      question,
    });

    // 4. Save assistant message
    const [assistantInsert] = await db.query(
      `INSERT INTO Conversation(role, content, token_count) VALUES(?, ?, ?)`,
      ["assistant", text, totalTokens],
    );

    // 5. Fetch full saved messages
    const userConversation = await getMessageById(userInsert.insertId);
    const assistantConversation = await getMessageById(
      assistantInsert.insertId,
    );

    return {
      userConversation,
      assistantConversation,
    };

    //  return {
    //   assistanAnswer
    // };
  } catch (error) {
    throw error;
  }
}
