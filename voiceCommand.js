const fs = require('fs');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient(); // Uses GOOGLE_APPLICATION_CREDENTIALS

async function transcribe(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file does not exist at: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    console.log(`📄 File size: ${stats.size} bytes`);
    if (stats.size < 1000) {
      throw new Error('Recorded audio file is too small or empty.');
    }

    const audioBytes = fs.readFileSync(filePath).toString('base64');
    console.log(`📦 Encoded audio length: ${audioBytes.length} characters`);

    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    });

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    return transcription;
  } catch (err) {
    console.error('❌ Transcription failed:', err);
    throw err;
  }
}

module.exports = {
  transcribe
};

