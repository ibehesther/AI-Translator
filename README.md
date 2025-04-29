# AI-Translator

[Live Demo](https://www.loom.com/share/ccaf1a41dc3b43c18344ea31fb9dcd90?sid=efd79653-5b3c-4c9e-80c7-9c60ba4fe0c4)

## User guide
1. Access the application
Use a browser (example Google Chrome) to open the application
2. Select the source and target languages using the drop down
3. Click the record icon button to start recording your speech
4. Click the stop icon button to stop recording
The transcript is then generated and displayed
5. Click the ‘Listen’ tab
6. Click the ‘Play icon’ button
This will translate the generated transcript and display it as well as audio playback in target language
## Technical Requirements
● Python 3x
● Flask (pip install flask)
● Generative API Key (Deepgram, Deepl and Elevenlabs)
● Stable internet connection
## Installation and setup
● Clone repository
● Install dependencies >> pip install app/requirements.txt
● Configure Generative API keys in .env file
● Set up venv
● Run app >> `python gunicorn app:app`
## Key Features
1. Multi language support
2. Simple interface
3. Dual transcript display
4. Voice-to-Text with Generative AI
How to Use


## Limitations
Due to financial contraints I could only use the free tier of the generative AI tools, which come with a number of limitations
- Limited number of characters that can be translated or transcribed
- [ElevenLabs](https://elevenlabs.io/docs/quickstart) prevents the audio playback on a different device or remote location as it ties the API key to my IP address

