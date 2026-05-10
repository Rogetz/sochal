// Complete working camera/mic handling with debug logging
export class MediaService {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  async getCameraPermissions(): Promise<boolean> {
    console.log("getCameraPermissions: Starting...");
    try {
      // First check if permissions already granted
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log("Camera permission state:", permissions.state);
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log("getCameraPermissions: Success! Got stream");
      stream.getTracks().forEach(track => {
        console.log(`Track: ${track.kind}, enabled: ${track.enabled}`);
        track.stop();
      });
      return true;
    } catch (error: any) {
      console.error("Camera permission error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      
      if (error.name === "NotAllowedError") {
        alert("Please allow camera and microphone access. Click the camera icon in your browser address bar and allow access.");
      } else if (error.name === "NotFoundError") {
        alert("No camera found on this device. Please connect a camera.");
      } else if (error.name === "NotReadableError") {
        alert("Camera is already in use by another application. Please close other apps using your camera.");
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
      
      this.stream.getTracks().forEach(track => {
        console.log(`- ${track.kind}: ${track.label}, enabled: ${track.enabled}`);
      });
      
      return this.stream;
    } catch (error: any) {
      console.error("Failed to start stream:", error);
      console.error("Error details:", error.name, error.message);
      
      if (error.name === "NotAllowedError") {
        alert("Camera access denied. Please:\n1. Click the camera icon in your browser address bar\n2. Select 'Allow'\n3. Refresh the page");
      } else if (error.name === "NotFoundError") {
        alert("No camera found. Please connect a camera to your device.");
      } else {
        alert(`Camera error: ${error.message}. Please check your camera and try again.`);
      }
      return null;
    }
  }

  async startRecording(): Promise<void> {
    console.log("startRecording: Called");
    if (!this.stream) {
      console.error("No stream available for recording");
      alert("No camera stream available. Please check your camera access.");
      return;
    }
    
    console.log("Stream tracks:", this.stream.getTracks().length);
    this.recordedChunks = [];
    
    // Find supported mime type
    const mimeType = this.getSupportedMimeType();
    console.log("Using mime type:", mimeType);
    
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      console.log("MediaRecorder created");
      
      this.mediaRecorder.ondataavailable = (event) => {
        console.log("Data available, size:", event.data.size);
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
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
        console.log("Supported mime type:", type);
        return type;
      }
    }
    console.log("No supported mime type found, using default");
    return 'video/webm';
  }

  async stopRecording(): Promise<Blob> {
    console.log("stopRecording: Called, recorded chunks:", this.recordedChunks.length);
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        console.log("No media recorder");
        resolve(new Blob());
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.getSupportedMimeType() });
        console.log("Recording stopped, blob size:", blob.size);
        this.recordedChunks = [];
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
    });
  }

  async switchCamera(): Promise<void> {
    console.log("switchCamera: Called");
    if (!this.stream) return;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      console.log("No video track found");
      return;
    }
    
    const currentFacingMode = videoTrack.getSettings().facingMode;
    console.log("Current facing mode:", currentFacingMode);
    const newFacingMode = currentFacingMode === "user" ? "environment" : "user";
    console.log("Switching to:", newFacingMode);
    
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
      console.log("Camera switched successfully");
    } catch (error) {
      console.error("Failed to switch camera:", error);
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    console.log("toggleVideo:", enabled);
    if (!this.stream) return;
    const videoTrack = this.stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled;
      console.log("Video track enabled:", videoTrack.enabled);
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    console.log("toggleAudio:", enabled);
    if (!this.stream) return;
    const audioTrack = this.stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
      console.log("Audio track enabled:", audioTrack.enabled);
    }
  }

  takeSnapshot(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.stream) {
        resolve(null);
        return;
      }
      
      const video = document.createElement('video');
      video.srcObject = this.stream;
      video.play();
      
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg'));
        video.pause();
        video.remove();
      };
    });
  }

  stopStream(): void {
    console.log("stopStream: Called");
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`);
        track.stop();
      });
      this.stream = null;
    }
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
  }

  async checkDeviceSupport(): Promise<{ camera: boolean; mic: boolean }> {
    console.log("checkDeviceSupport: Called");
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("Available devices:", devices);
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMic = devices.some(device => device.kind === 'audioinput');
      console.log("Has camera:", hasCamera, "Has mic:", hasMic);
      return { camera: hasCamera, mic: hasMic };
    } catch (error) {
      console.error("Failed to enumerate devices:", error);
      return { camera: false, mic: false };
    }
  }
}

export const mediaService = new MediaService();