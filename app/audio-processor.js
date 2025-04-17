class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
      // Get the input audio data from the first channel
      const inputData = inputs[0][0];
      console.log('inputData: ', inputData)

      // Do something with the audio data
      // ...
      
      return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);