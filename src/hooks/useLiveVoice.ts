import { useState, useRef } from 'react';
import { playAudioChunk, pcmToBase64 } from '../utils/audio';

export function useLiveVoice(appendCallMessage: (role: 'user'|'ai', content: string, msgIdOverride?: string) => void, setMessages: React.Dispatch<React.SetStateAction<any[]>>) {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const currentLiveAiMsgIdRef = useRef<string | null>(null);
  const currentLiveAiTextRef = useRef<string>('');

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOff;
        setIsCameraOff(!isCameraOff);
      }
    }
  };

  const toggleLiveVoice = async (isMicListening: boolean, setIsMicListening: (b: boolean) => void, recognitionRef: any) => {
    if (isLiveActive) {
      setIsLiveActive(false);
      liveWsRef.current?.close();
      liveWsRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      processorRef.current?.disconnect();
      inputAudioCtxRef.current?.close();
      outputAudioCtxRef.current?.close();
      return;
    }

    if (isMicListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      setIsMicListening(false);
    }

    try {
      setIsLiveActive(true);

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/live`;
      const socket = new WebSocket(wsUrl);
      liveWsRef.current = socket;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          const pcmData = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(pcmData);
          socket.send(JSON.stringify({ audio: base64 }));
        }
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          playAudioChunk(outputCtx, msg.audio, nextStartTimeRef);
        }
        if (msg.text) {
          currentLiveAiTextRef.current += msg.text;
          if (!currentLiveAiMsgIdRef.current) {
            currentLiveAiMsgIdRef.current = `${Date.now()}_ai_live_${Math.random().toString(36).substring(2, 7)}`;
          }
          appendCallMessage('ai', currentLiveAiTextRef.current, currentLiveAiMsgIdRef.current);
        }
        if (msg.turnComplete) {
          currentLiveAiMsgIdRef.current = null;
          currentLiveAiTextRef.current = '';
        }
        if (msg.interrupted) {
          nextStartTimeRef.current = outputCtx.currentTime;
          currentLiveAiMsgIdRef.current = null;
          currentLiveAiTextRef.current = '';
        }
      };

      socket.onclose = () => {
        setIsLiveActive(false);
      };

    } catch (err) {
      console.error("Live Voice Error:", err);
      setIsLiveActive(false);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: "माइक्रोफ़ोन एक्सेस करने में त्रुटि (Permission denied)। कृपया सुनिश्चित करें कि आपने माइक्रोफ़ोन की अनुमति दी है। यदि आप इसे प्रीव्यू विंडो में चला रहे हैं, तो हो सकता है कि ब्राउज़र इसे ब्लॉक कर रहा हो। कृपया ऐप को एक नए टैब (New Tab) में खोलकर प्रयास करें।"
      }]);
    }
  };

  return {
    isLiveActive,
    isMuted,
    isCameraOff,
    toggleLiveVoice,
    toggleMute,
    toggleCamera,
    setIsLiveActive
  };
}
