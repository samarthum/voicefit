import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { openai } from "@/lib/openai";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

    // Get form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return errorResponse("No audio file provided");
    }

    // Validate file size (max 25MB for OpenAI)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_FILE_SIZE) {
      return errorResponse("Audio file too large. Maximum size is 25MB.");
    }

    // Transcribe using gpt-4o-transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-transcribe",
      response_format: "text",
    });

    console.log("Transcription result:", JSON.stringify(transcription));

    // With response_format: "text", the result is a plain string
    const transcriptText = typeof transcription === "string"
      ? transcription
      : (transcription as unknown as { text?: string }).text || "";

    return successResponse({ transcript: transcriptText });
  } catch (error) {
    console.error("Transcription error:", error);

    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes("Invalid file format")) {
        return errorResponse("Invalid audio format. Please use a supported format (mp3, mp4, mpeg, mpga, m4a, wav, webm).");
      }
    }

    return errorResponse("Failed to transcribe audio. Please try again.", 500);
  }
}
