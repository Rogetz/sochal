// Complete working camera/mic handling with debug logging
export class MediaService {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  async getCameraPermissions(): Promise<boolean> {
    console.log("getCameraPermissions: Starting...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log("getCameraPermissions: Success! Got stream");
      // DO NOT stop the tracks here - keep the stream alive
      return true;
    } catch (error: any) {
      console.error("Camera permission error:", error);
      if (error.name === "NotAllowedError") {
        alert("Please allow camera and microphone access. Click the camera icon in your browser address bar and allow access.");
      } else if (error.name === "NotFoundError") {
        alert("No camera found on this device. Please connect a camera.");
      } else if (error.name === "NotReadableError") {
        alert("Camera is already in use by another application.");
      }
      return false;
    }
  }

  async startStream(videoEnabled: boolean = true, audioEnabled: boolean = true): Promise<MediaStream | null> {
    console.log("startStream: Starting with video:", videoEnabled, "audio:", audioEnabled);
    try {
      // Stop any existing stream
      if (this.stream) {
        this.stopStream();
      }
      
      const constraints: MediaStreamConstraints = {
        video: videoEnabled ? { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false,
        audio: audioEnabled,
      };
      
      console.log("Requesting media with constraints:", constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("startStream: Success! Stream tracks:", this.stream.getTracks().length);
      
      return this.stream;
    } catch (error: any) {
      console.error("Failed to start stream:", error);
      alert(`Camera error: ${error.message}. Please check your camera and try again.`);
      return null;
    }
  }

  async startRecording(): Promise<void> {
    console.log("startRecording: Called");
    if (!this.stream) {
      console.error("No stream available for recording");
      alert("No camera stream available. Please request permissions first.");
      return;
    }
    
    this.recordedChunks = [];
    const mimeType = this.getSupportedMimeType();
    
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.start(1000);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Failed to start recording. Please try again.");
    }
  }

  getSupportedMimeType(): string {
    const types = [
      'video/webm',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  async stopRecording(): Promise<Blob> {
    console.log("stopRecording: Called");
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        console.log("Recording stopped, blob size:", blob.size);
        this.recordedChunks = [];
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
    });
  }

  async switchCamera(): Promise<void> {
    if (!this.stream) return;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === "user" ? "environment" : "user";
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacingMode } },
        audio: true,
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = this.stream.getVideoTracks()[0];
      
      this.stream.removeTrack(oldVideoTrack);
      this.stream.addTrack(newVideoTrack);
      oldVideoTrack.stop();
    } catch (error) {
      console.error("Failed to switch camera:", error);
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.stream) return;
    const videoTrack = this.stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled;
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    if (!this.stream) return;
    const audioTrack = this.stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
    }
  }

  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
  }

  async checkDeviceSupport(): Promise<{ camera: boolean; mic: boolean }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMic = devices.some(device => device.kind === 'audioinput');
      return { camera: hasCamera, mic: hasMic };
    } catch (error) {
      return { camera: false, mic: false };
    }
  }
}

export const mediaService = new MediaService();