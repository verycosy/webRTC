const socket = io();

//TODO: 연결 위에 pc 객체 상태 바뀌나? / pc나 stream이 없을 경우 예외처리 / pcConfig가 없다면? 결과는?

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const resoultionList = document.getElementById("resolutionList");
const mediaConstraintList = document.getElementById("mediaConstraintList");
const enumerateDeviceList = document.getElementById("enumerateDeviceList");

const offerButton = document.getElementById("offer");
const answerButton = document.getElementById("answer");

const userPlatform = document.getElementById("userPlatform");
const videoStreamInfo = document.getElementById("videoStreamInfo");
const currentVideoStream = document.getElementById("currentVideoStream");
const audioStreamInfo = document.getElementById("audioStreamInfo");
const currentAudioStream = document.getElementById("currentAudioStream");

let net = null;
let pc = null,
  localStream = null;

const color = "orangered";
const lineWidth = 4;

const ashiq = new Image();
ashiq.src = "./portrait_ashiq.jpg";

const pcConfig = [
  {
    iceServers: [{ url: "stun:stun.l.google.com:19302" }]
  }
];

const mediaStreamConstraints = {
  default: {
    video: true,
    audio: true
  },
  qvga: {
    video: { width: { exact: 320 }, height: { exact: 240 } }
  },
  vga: {
    video: { width: { exact: 640 }, height: { exact: 480 } }
  },
  hd: {
    video: { width: { exact: 1280 }, height: { exact: 720 } }
  },
  fullHD: {
    video: { width: { exact: 1920 }, height: { exact: 1080 } }
  },
  fourK: {
    video: { width: { exact: 4096 }, height: { exact: 2160 } }
  }
}; // ideal, max, min, aspectRatio : { ideal: 1.333 }

function addItem(ul, item) {
  const li = document.createElement("li");
  li.textContent = item;

  ul.appendChild(li);
}

function showUserPlatform() {
  addItem(userPlatform, navigator.platform);
}

function showSupportedConstraints() {
  const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();

  for (let constraints in supportedConstraints) {
    addItem(mediaConstraintList, constraints);
  }
}

function showEnumerateDeivces() {
  navigator.mediaDevices.enumerateDevices().then(
    devices => {
      devices.forEach(device => {
        addItem(
          enumerateDeviceList,
          `${device.constructor.name} |
          ${device.kind} |
          ${device.label} |
          ${device.groupId} |
          ${device.deviceId}`
        );
      });
    },
    err => console.error(err)
  );
}

function showObject(element, obj) {
  Object.keys(obj).forEach(key => {
    let string = null;

    if (typeof obj[key] === "object")
      string = `${key} : ${JSON.stringify(obj[key])}\n`;
    else string = `${key} : ${obj[key]}\n`;

    addItem(element, string);
  });
}

async function drawFromVideo(video, ctx) {
  const { keypoints } = await net.estimateSinglePose(video, 0.5, true, 16);

  ctx.fillStyle = "red";

  keypoints.forEach(({ part, position: { x, y } }) => {
    console.log(`${part} drawing at (${x}, ${y})`);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2, true);
    ctx.fill();
  });
}

async function tracking(evt) {
  console.log("Tracking Start");
  const { target: video } = evt;
  const canvas = video.previousElementSibling;
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  video.width = video.videoWidth;
  video.height = video.videoHeight;

  setInterval(async () => {
    const { keypoints } = await net.estimateSinglePose(video, 0.5, true, 16);
    ctx.clearRect(0, 0, video.width, video.height);

    //drawFromVideo(video, ctx);
    ctx.drawImage(
      ashiq,
      keypoints[0].position.x - 50,
      keypoints[0].position.y - 50,
      100,
      100
    );
    drawSkeleton(keypoints, 0.5, ctx);
  }, 100);
}

async function getMedia() {
  let stream = null;

  try {
    if (resoultionList.value === "desktop")
      stream = await navigator.mediaDevices.getDisplayMedia();
    else
      stream = await navigator.mediaDevices.getUserMedia(
        mediaStreamConstraints[resoultionList.value]
      );

    localVideo.srcObject = stream;
    localStream = stream;

    console.log("✅ Add Local Stream Tracks to RTCPeerConnection");

    stream.getTracks().forEach(async track => {
      const RTCRtpSender = pc.addTrack(track, localStream); // pc.getSenders()
      console.log(RTCRtpSender);

      if (track.kind === "video") {
        showObject(videoStreamInfo, track.getCapabilities());
        showObject(currentVideoStream, track.getSettings());
      } else {
        showObject(audioStreamInfo, track.getCapabilities());
        showObject(currentAudioStream, track.getSettings());
      }
    });
  } catch (err) {
    alert(err.name + " : " + err.message);
  }
}

function eventHandler(callback) {
  return evt => {
    const {
      target: {
        signalingState,
        iceGatheringState,
        iceConnectionState,
        connectionState
      }
    } = evt;
    console.log(`✅ ${evt.type}`, evt);
    if (typeof callback === "function") callback(evt);
  };
}

const getStatus = () => {
  if (pc) {
    pc.getStats()
      .then(res => showStatus(res))
      .catch(err => console.log(err));
  } else {
    console.log("Not connected yet :(");
  }
};

const showStatus = result => {
  console.log("===================");
  result.forEach(status => console.log(status));
};

function createPeerConnection() {
  pc = new RTCPeerConnection();

  console.log("✅ Create RTCPeerConnection");
  console.log(pc);

  getStatus();

  pc.addEventListener(
    "connectionstatechange",
    eventHandler(({ currentTarget: { connectionState } }) => {
      if (connectionState === "connected") setInterval(getStatus, 1000);
    })
  );
  pc.addEventListener("datachannel", eventHandler());
  pc.addEventListener(
    "icecandidate",
    eventHandler(evt => {
      if (evt.candidate) {
        console.log("✅ Send ICE Candidate");
        socket.emit("icecandidate", evt.candidate);
      }
    })
  );
  pc.addEventListener("icecandidateerror", eventHandler());
  pc.addEventListener("iceconnectionstatechange", eventHandler());
  pc.addEventListener("icegatheringstatechange", eventHandler());
  pc.addEventListener("negotiationneeded", eventHandler());
  pc.addEventListener("signalingstatechange", eventHandler());
  pc.addEventListener("statsended", eventHandler());
  pc.addEventListener(
    "track",
    eventHandler(evt => {
      remoteVideo.srcObject = evt.streams[0]; // addTrack에 localstream 안 붙여주면 [] 임
    })
  );
}

async function offer() {
  if (!pc) await createPeerConnection();

  await getMedia();

  try {
    console.log("✅ Create SDP Offer");

    const sdpOffer = await pc.createOffer();
    pc.setLocalDescription(sdpOffer);
    socket.emit("offer", sdpOffer);
  } catch (err) {
    console.log(err);
  }
}

async function answer() {
  try {
    console.log("✅ Create SDP Answer");

    const sdpAnswer = await pc.createAnswer();
    pc.setLocalDescription(sdpAnswer);
    socket.emit("answer", sdpAnswer);
  } catch (err) {
    console.log(err);
  }
}

function socketSetting() {
  socket.on("offer", async sdpOffer => {
    console.log(`✅ I got offer`);

    if (!pc) createPeerConnection();
    pc.setRemoteDescription(sdpOffer);
    await getMedia();
    // 순서주의 DOMException: Failed to execute 'addIceCandidate' on 'RTCPeerConnection': Error processing ICE candidate
    // Why ??? https://stackoverflow.com/questions/13396071/errors-when-ice-candidates-are-received-before-answer-is-sent
  });

  socket.on("answer", sdpAnswer => {
    console.log(`✅ I got answer`);
    pc.setRemoteDescription(sdpAnswer);
  });

  socket.on("icecandidate", icecandidate => {
    console.log(`✅ I got icecandidate`);
    pc.addIceCandidate(icecandidate);
  });
}

async function init() {
  net = await posenet.load();
  console.log("MODEL LOADING DONE");
  socketSetting();

  if (navigator.mediaDevices) {
    showUserPlatform();
    showEnumerateDeivces();
    showSupportedConstraints();

    localVideo.addEventListener("loadeddata", tracking);
    remoteVideo.addEventListener("loadeddata", tracking);

    // remoteVideo.src = "/sample.mp4";
    // remoteVideo.load();

    resoultionList.addEventListener("change", getMedia);

    offerButton.addEventListener("click", offer);
    answerButton.addEventListener("click", answer);
  } else {
    alert("Not Supported Environment");
  }
}

//

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = 7;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
    keypoints,
    minConfidence
  );

  function toTuple({ y, x }) {
    return [y, x];
  }

  adjacentKeyPoints.forEach(keypoints => {
    drawSegment(
      toTuple(keypoints[0].position),
      toTuple(keypoints[1].position),
      color,
      scale,
      ctx
    );
  });
}

init();

/*
Try calling localStream.getVideoTracks()[0].stop().

In order to set up and maintain a WebRTC call, WebRTC clients (peers) need to exchange metadata:

Candidate (network) information.
Offer and answer messages providing information about media, such as resolution and codecs.
In other words, an exchange of metadata is required before peer-to-peer streaming of audio, video, or data can take place. This process is called signaling.

What alternative messaging mechanisms might be possible? What problems might you encounter using 'pure' WebSocket?
What issues might be involved with scaling this application? Can you develop a method for testing thousands or millions of simultaneous room requests?
*/

/*

DataChannel

For SCTP, reliable and ordered delivery is true by default.
Notice the use of dataConstraint. Data channels can be configured to enable different types of data sharing — for example, prioritizing reliable delivery over performance.
With SCTP, the protocol used by WebRTC data channels, reliable and ordered data delivery is on by default. When might RTCDataChannel need to provide reliable delivery of data, and when might performance be more important — even if that means losing some data?

*/
