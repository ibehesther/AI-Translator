import os
from urllib import response
from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_cors import CORS
import requests
import time
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
CAMBAI_API_KEY=os.getenv('CAMBAI_API_KEY')

UPLOAD_FOLDER = 'app/static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

AUDIO_DIR = os.path.join(app.config['UPLOAD_FOLDER'])



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
    # try:
    #     language = request.form.get('language')
    #     audio_file = request.files['audio']

    #     filename = os.path.join(app.config['UPLOAD_FOLDER'], audio_file.filename)
    #     audio_file.save(filename)

    #     with open(filename, "rb") as file:
    #         buffer_data = file.read()
       
    #     print(audio_file.filename)
    #     files = {
    #         'file': (audio_file.filename, buffer_data,'audio/mpeg'),
    #     }
    #     data = {
    #         'language': language 
    #     }
    #     boundary = "-----011000010111000001101001"  
    #     crlf = b"\r\n"

    #     payload = [
    #         f"--{boundary}",
    #         'Content-Disposition: form-data; name="language"',
    #         '',
    #         str(language),
    #         f"--{boundary}",
    #         f'Content-Disposition: form-data; name="file"; filename="{audio_file.filename}"',
    #         'Content-Type: application/octet-stream',
    #         '',
    #         buffer_data,
    #         f"--{boundary}--",
    #         ''
    #     ]
    #     # payload= f"-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\n{int(language)}\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"\r\n\r\n{audio_file.filename}\r\n-----011000010111000001101001--\r\n\r\n"
    #     payload_bytes = b'\r\n'.join([
    #             part.encode('utf-8') if isinstance(part, str) else part 
    #             for part in payload
    #         ])       
    #     headers = {
    #         "x-api-key": CAMBAI_API_KEY,
    #         "Content-Type": f"multipart/form-data; boundary={boundary}"
    #     }
    #     transcript_response = requests.post('https://client.camb.ai/apis/transcribe', data=payload_bytes, headers=headers)
    #     print('transcript_response: ', transcript_response.json())
    #     return jsonify({
    #         'message': 'Audio transcribed successfully',
    #         'filename': audio_file.filename,
    #         'content': {
    #             # 'transcript': response_json.alternatives[0].transcript,
    #             # 'paragraphs': response_json.alternatives[0].paragraphs.paragraphs,
    #             # 'language': response_json.detected_language
    #         },
    #     })
    # except Exception as e:
    #     return jsonify({"error": str(e)}), 500 



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

@app.route('/api/synthesize', methods=['POST'])
def synthesize_speech():
    data = request.json
    text = data.get('text')
    language = data.get('language')
    voice_id = data.get('voice_id')

    run_id = None
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    filepath = os.path.join(AUDIO_DIR , 'audio.wav')
    
    try:
        headers = {
            'x-api-key': CAMBAI_API_KEY,
            'Content-Type': 'application/json'
        }
        
        payload = {
            "text": text,
            "language": language,
            "voice_id":voice_id  
        }
        
        ttsResponse = requests.post('https://client.camb.ai/apis/tts', json=payload, headers=headers)
        task_id = ttsResponse.json().get('task_id')


        max_attempts = 10
        wait_time = 1 
        
        for attempt in range(max_attempts):
            status_response = requests.get(
                f"https://client.camb.ai/apis/tts/{task_id}",
                headers={'x-api-key': CAMBAI_API_KEY}
            )
            status_response.raise_for_status()
            
            status_data = status_response.json()
            run_id = status_data.get('run_id')
            status = status_data.get('status')

            print(f"Attempt {attempt + 1}: Status - {status}, Run ID - {run_id}")
            
            if status == 'SUCCESS' and run_id:
                break
            elif status == 'FAILED':
                return jsonify({'error': 'TTS synthesis failed'}), 500
            
            time.sleep(wait_time)
            wait_time *= 1.5 
        else:
            return jsonify({'error': 'TTS synthesis timed out'}), 504
        

        tts_result = requests.get(f"https://client.camb.ai/apis/tts-result/{run_id}?output_type=raw_bytes", headers={"x-api-key": CAMBAI_API_KEY}, stream=True)

        print('tts_result: ', tts_result.raise_for_status())
        if tts_result.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in tts_result.iter_content(chunk_size=1024):
                    if chunk:
                        f.write(chunk)
            print(f"Audio saved to {filepath}")
                
            return jsonify({
                'success': True,
                'audio_url': f"{filepath}"
            })
        else:
            print(f"Request failed with status code: {tts_result.status_code}")
            print(f"Response content: {tts_result.content}")
    
    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/uploads/<filename>')
def serve_audio(filename):
    print(f"Serving audio file: {filename}", send_from_directory(AUDIO_DIR, filename))
    return send_from_directory(AUDIO_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True)