export const pcmToBase64 = (pcmData: Float32Array) => {
  const buffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcmData.length; i++) {
    let s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const playAudioChunk = (
  ctx: AudioContext,
  base64Audio: string,
  nextStartTimeRef: React.MutableRefObject<number>
) => {
  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const numSamples = bytes.byteLength / 2;
  const floatArray = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const int16 = view.getInt16(i * 2, true);
    floatArray[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
  }

  const audioBuffer = ctx.createBuffer(1, floatArray.length, 24000);
  audioBuffer.getChannelData(0).set(floatArray);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  const currentTime = ctx.currentTime;
  if (nextStartTimeRef.current < currentTime) {
    nextStartTimeRef.current = currentTime;
  }

  source.start(nextStartTimeRef.current);
  nextStartTimeRef.current += audioBuffer.duration;
};
