/** Opens the front camera and returns a playing (off-screen) video element. */
export async function openFrontCamera(): Promise<{ video: HTMLVideoElement; stream: MediaStream }> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera API not available");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  return { video, stream };
}
