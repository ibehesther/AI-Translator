const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const listenTab = document.getElementById("listen-tab");
const speakTab = document.getElementById("speak-tab");
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
const speakMessage = document.getElementById("speak-message");
const listenMessage = document.getElementById("listen-message");

let mediaRecorder;
let micStream;
let audioSrc;

let audioIN = { audio: false };

let transcript;
let transcriptSourceLang = 1;
let transcriptTargetLang = outputLang.innerText.toLowerCase();
let speechTargetId = 1;
let translatedText = "";

const getLanguageOption = (lang) => {
	if (lang.toLowerCase() == "en") {
		return lang;
	}
	return "multi";
};
const handleLangSelect = (mode, id, label, code, altCode = "") => {
	console.log("id: ", id);
	if (mode == "input") {
		inputLang.innerText = code;
		inputLangLabel.innerHTML = label;
	} else {
		outputLang.innerText = code;
		outputLangLabel.innerHTML = label;

		transcriptTargetLang = code;
		speechTargetId = id;
	}
};

const handleRecord = async () => {
	stopBtn.classList.remove("hide");
	recordBtn.classList.add("hide");
	speakActionText.innerHTML =
		'Click <i class="fas fa-stop"></i> to stop recording';

	speakMssgCard.innerHTML = "";

	const constraints = {
		audio: true,
		video: false,
	};
	micStream = await navigator.mediaDevices.getUserMedia(constraints);

	

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
	speakMessage.innerText = "Recording stopped. Processing audio...";
	speakMessage.style.color = "black";
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
			formData.append("language", transcriptSourceLang);

			const response = await fetch("/api/transcribe", {
				method: "POST",
				body: formData,
			});
			const result = await response.json();
			if (result.content?.paragraphs.length == 0) {
				speakMessage.innerText =
					"Unable to transcribe successfully. Please try again.";
				speakMessage.style.color = "red";
				return;
			}
			speakMessage.innerText = "";

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
	try {
		listenMessage.innerText = "Retrieving audio...";
		listenMessage.style.color = "black";
		const speechResponse = await fetch("/api/synthesize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text: translatedText,
				language: speechTargetId,
				voice_id: 20298,
			}),
		});
		const JSONSpeechResponse = await speechResponse.json();
		console.log("speechResponse", JSONSpeechResponse);
		if (JSONSpeechResponse?.success) {
			listenMessage.innerText = "";

			playAudio.src = "static/uploads/audio.wav";
			playAudio.play();

			playAudio.onended = function () {
				handlePause();
			};
		} else {
			console.error(
				"Error: " + (JSONSpeechResponse.data.error || "Unknown error")
			);
		}
	} catch (e) {
		console.error("An error occured: ", e);
		listenMessage.innerText = "An error occurred. Please try again.";
		listenMessage.style.color = "red";
	}
};

const handlePause = () => {
	pauseBtn.classList.add("hide");
	playBtn.classList.remove("hide");
	listenActionText.innerHTML =
		'Click <i class="fas fa-play"></i> to start playing';
};

listenTab.addEventListener("click", async (e) => {
	playBtn.classList.add("disabled-btn");
	listenMssgCard.innerHTML = "";
	listenMessage.innerText = "Translation in progress...";
	listenMessage.style.color = "black";
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
		translatedText = JSONResponse.text;

		const sectionEl = document.createElement("div");
		const sentences = JSONResponse.text.split(".");
		for (let sentence of sentences) {
			const textEl = `<p>${sentence}</p>`;
			sectionEl.innerHTML += textEl;
		}
		listenMssgCard.appendChild(sectionEl);
		listenMessage.innerText = "";
		playBtn.classList.remove("disabled-btn");
	} catch (e) {
		console.error("An error occured: ", e);
		listenMessage.innerText = "An error occurred. Please try again.";
		listenMessage.style.color = "red";
	}
});

speakTab.addEventListener("click", async (e) => {
	speakMssgCard.innerHTML = "";
});
