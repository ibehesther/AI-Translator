const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const speakActionText = document.getElementById("action-text-0");
const listenActionText = document.getElementById("action-text-1");
const recordAudio = document.getElementById("record-audio");
const playAudio = document.getElementById("play-audio");
const inputLang = document.getElementById("input-lang");
const outputLang = document.getElementById("output-lang");
const inputLangLabel = document.getElementById("input-lang-label");
const outputLangLabel = document.getElementById("output-lang-label");
const speakMssgCard = document.getElementById("speak-message-card");
const listenMssgCard = document.getElementById("listen-message-card");

let mediaRecorder;
let micStream;
let audioSrc;

let audioIN = { audio: false };

let transcript;
let transcriptTargetLang = outputLang.innerText.toLowerCase();

const getLanguageOption = (lang) => {
	if (lang == "en") {
		return lang;
	}
	return "multi";
};
const handleLangSelect = (mode, label, code, altCode = "") => {
	if (mode == "input") {
		inputLang.innerText = code;
		inputLangLabel.innerHTML = label;
	} else {
		outputLang.innerText = code;
		outputLangLabel.innerHTML = label;

		transcriptTargetLang = altCode || code;
	}
};

const handleRecord = async () => {
	stopBtn.classList.remove("hide");
	recordBtn.classList.add("hide");
	speakActionText.innerHTML =
		'Click <i class="fas fa-stop"></i> to stop recording';

	speakMssgCard.innerHTML = "";

	micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

	if ("srcObject" in recordAudio) {
		recordAudio.srcObject = micStream;
	} else {
		recordAudio.src = window.URL.createObjectURL(micStream);
	}
	recordAudio.onloadedmetadata = function (ev) {
		recordAudio.play();
	};
	mediaRecorder = new MediaRecorder(micStream);
	mediaRecorder.start();
};

const handleTranscriptFormat = (paragraphs, cardEl) => {
	if (!paragraphs.length) {
		return;
	}
	cardEl.innerHTML = "";
	const sectionEl = document.createElement("div");
	for (let paragraph of paragraphs) {
		const sentences = paragraph.sentences;
		for (let sentence of sentences) {
			const textEl = `<p>${sentence.text}</p>`;
			sectionEl.innerHTML += textEl;
		}

		cardEl.appendChild(sectionEl);
	}
};

const handleStop = async () => {
	stopBtn.classList.add("hide");
	recordBtn.classList.remove("hide");
	speakActionText.innerHTML =
		'Click <i class="fas fa-microphone"></i> to start recording';

	try {
		if (micStream) {
			micStream.getTracks().forEach((track) => track.stop());
		}
		mediaRecorder.stop();
		mediaRecorder.ondataavailable = function (ev) {
			dataArray.push(ev.data);
		};

		let dataArray = [];

		mediaRecorder.onstop = async function (ev) {
			let audioData = new Blob(dataArray, { type: "audio/mp3;" });

			dataArray = [];

			audioSrc = window.URL.createObjectURL(audioData);

			const formData = new FormData();
			const lang = getLanguageOption(inputLang.innerText.toLowerCase());
			formData.append("audio", audioData, "recording.wav");
			formData.append("text", lang);

			const response = await fetch("/api/transcribe", {
				method: "POST",
				body: formData,
			});
			const result = await response.json();
			handleTranscriptFormat(result.content?.paragraphs || [], speakMssgCard);
			transcript = result.content?.transcript || "";
		};
	} catch (e) {
		console.error("An error occured: ", e);
	}
};

const handlePlay = async () => {
	playBtn.classList.add("hide");
	pauseBtn.classList.remove("hide");
	listenActionText.innerHTML = 'Click <i class="fas fa-pause"></i> to pause';
	listenMssgCard.innerHTML = "";

	try {
		const response = await fetch("/api/translate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text: transcript,
				lang: transcriptTargetLang.trim(),
			}),
		});

		const JSONResponse = await response.json();

		if (JSONResponse?.error) {
			throw new Error(JSONResponse.message);
		}

		const sectionEl = document.createElement("div");
		const sentences = JSONResponse.text.split(".");
		for (let sentence of sentences) {
			const textEl = `<p>${sentence}</p>`;
			sectionEl.innerHTML += textEl;
		}
		listenMssgCard.appendChild(sectionEl);

		const speechResponse = await fetch("/api/speech", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text: JSONResponse.text,
			}),
		});

	} catch (e) {
		console.error("An error occured: ", e);
	}
};

const handlePause = () => {
	pauseBtn.classList.add("hide");
	playBtn.classList.remove("hide");
	listenActionText.innerHTML =
		'Click <i class="fas fa-play"></i> to start playing';
};
