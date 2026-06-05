import io
import anyio
import assemblyai as aai
from openai import AsyncOpenAI
from app.core.config import get_settings

settings = get_settings()


async def transcribe_recording_assemblyai(file_bytes: bytes) -> str:
    """Transcribes audio bytes using AssemblyAI or OpenAI Whisper depending on configuration.
    
    If neither API key is configured, returns a mock transcription.
    """
    # 1. Try AssemblyAI if key is configured
    aai_key = settings.assemblyai_api_key.strip()
    if aai_key and aai_key != "your_key_here":
        aai.settings.api_key = aai_key
        audio_file = io.BytesIO(file_bytes)
        transcriber = aai.Transcriber()
        transcript = await anyio.to_thread.run_sync(transcriber.transcribe, audio_file)
        
        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(f"AssemblyAI transcription failed: {transcript.error}")
            
        return transcript.text
        
    # 2. Fallback to OpenAI Whisper if key is configured
    openai_key = settings.openai_api_key.strip()
    if openai_key and openai_key != "your-key-here" and openai_key != "your_key_here":
        client = AsyncOpenAI(api_key=openai_key)
        audio_file = io.BytesIO(file_bytes)
        
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=("recording.webm", audio_file)
        )
        return transcript.text

    # 3. Offline developer fallback
    return "This is a mock transcription. Please configure ASSEMBLYAI_API_KEY or OPENAI_API_KEY in your env to enable live transcription."
