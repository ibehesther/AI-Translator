import os
from urllib import response
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import requests
from app.data import supported_langs, supported_output_langs
from dotenv import load_dotenv
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)
from elevenlabs.client import ElevenLabs
from elevenlabs import play

app = Flask(__name__)
CORS(app)

load_dotenv()
DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')
DEEPL_API_KEY=os.getenv('DEEPL_API_KEY')
ELEVENLABS_API_KEY=os.getenv('ELEVENLABS_API_KEY')

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/')
def home():
    return render_template('index.html', supported_langs=supported_langs, supported_output_langs=supported_output_langs)

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """Handle audio file uploads"""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400
    
    audio_file = request.files['audio']
    audio_lang = request.form.get('text')

    if audio_file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        filename = os.path.join(app.config['UPLOAD_FOLDER'], audio_file.filename)
        audio_file.save(filename)

        deepgram = DeepgramClient(api_key=DEEPGRAM_API_KEY)
        with open(filename, "rb") as file:
            buffer_data = file.read()
        payload: FileSource = {
            "buffer": buffer_data,
        }
        options = PrerecordedOptions(
            model="nova-3",
            smart_format=True,
            detect_language=True,
            language=audio_lang
        )
        response = deepgram.listen.rest.v("1").transcribe_file(payload, options)
        response_json = response.results.channels[0]

        return jsonify({
            'message': 'Audio transcribed successfully',
            'filename': audio_file.filename,
            'content': {
                'transcript': response_json.alternatives[0].transcript,
                'paragraphs': response_json.alternatives[0].paragraphs.paragraphs,
                'language': response_json.detected_language
            },
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        text = data.get('text')
        lang = data.get('lang')

        if not data:
            return jsonify({'error': 'Invalid payload'}), 400
        response = requests.post(
            "https://api-free.deepl.com/v2/translate",
            data={
                "text": text,
                "target_lang": lang,
                "auth_key": DEEPL_API_KEY
            }
        )
        if 'message' in response.json():
            return jsonify({
                "error": True,
                "message": response.json()['message']
                })
        
        translated_text = response.json()["translations"][0]["text"]
        return jsonify({'text': translated_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/speech', methods=['POST'])
def read_text():
    try:
        data = request.get_json()
        text = data.get('text')
        client = ElevenLabs(
            api_key=ELEVENLABS_API_KEY,
        )
        audio = client.text_to_speech.convert(
            text=text,
            voice_id="JBFqnCBsd6RMkjVDRZzb",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )

        play(audio)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)