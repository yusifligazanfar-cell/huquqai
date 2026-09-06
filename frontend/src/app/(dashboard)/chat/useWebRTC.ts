import { useState, useRef, useCallback } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: any[];
};

export function useWebRTC(onMessage: (msg: Message) => void) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const assistantResponseRef = useRef("");
  const assistantIdRef = useRef("");

  const stopWebRTC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  }, []);

  const startWebRTC = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      const tokenRes = await fetch('/api/session');
      if (!tokenRes.ok) throw new Error("Failed to get session token");
      const tokenData = await tokenRes.json();
      const ephemeralKey = tokenData.client_secret?.value;
      if (!ephemeralKey) throw new Error("No client_secret in token response");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      // Ensure the server sends audio transcription
      dc.addEventListener("open", () => {
        const event = {
          type: "session.update",
          session: {
            input_audio_transcription: {
              model: "whisper-1"
            }
          }
        };
        dc.send(JSON.stringify(event));

        // Proactively ask the AI to greet the user
        const greetEvent = {
          type: "response.create",
          response: {
            instructions: "Say exactly this in Azerbaijani with a warm tone: 'Salam! Mən Aşralı, sənə necə kömək edə bilərəm?'"
          }
        };
        dc.send(JSON.stringify(greetEvent));
      });

      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          
          if (event.type === 'response.audio_transcript.delta') {
            setIsSpeaking(true);
            if (!assistantIdRef.current) {
               assistantIdRef.current = Date.now().toString();
               assistantResponseRef.current = "";
            }
            assistantResponseRef.current += event.delta;
          }
          
          if (event.type === 'response.audio_transcript.done') {
            if (assistantResponseRef.current.trim()) {
              onMessage({
                id: assistantIdRef.current,
                role: 'assistant',
                content: assistantResponseRef.current,
                citations: []
              });
            }
            assistantIdRef.current = "";
            assistantResponseRef.current = "";
            setIsSpeaking(false);
          }
          
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
             onMessage({
               id: Date.now().toString(),
               role: 'user',
               content: event.transcript,
               citations: []
             });
          }
          
        } catch (err) {
          console.error("Error parsing data channel message", err);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });
      
      if (!sdpResponse.ok) throw new Error("Failed to connect to OpenAI WebRTC");

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);
      
      setIsConnected(true);
      setIsConnecting(false);

    } catch (err) {
      console.error("WebRTC Error:", err);
      stopWebRTC();
    }
  }, [onMessage, stopWebRTC]);

  return {
    startWebRTC,
    stopWebRTC,
    isConnecting,
    isConnected,
    isSpeaking
  };
}
