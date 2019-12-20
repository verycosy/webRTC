const socket = io();

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

let pc = null,
  localStream = null;

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
}; // ideal, max, min

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

    stream.getTracks().forEach(track => {
      console.log(pc.addTrack(track, localStream));

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
  console.log("===================");
};

function createPeerConnection() {
  pc = new RTCPeerConnection();

  console.log("✅ Create RTCPeerConnection");
  console.log(pc);

  pc.addEventListener(
    "connectionstatechange",
    eventHandler(({ currentTarget: { connectionState } }) => {
      console.log(connectionState);
      //if (connectionState === "connected") setInterval(getStatus, 1000);
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
      console.log(evt.streams); // addTrack에 localstream 안 붙여주면 [] 임
      remoteVideo.srcObject = evt.streams[0];
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

function init() {
  if (navigator.mediaDevices) {
    showUserPlatform();
    showEnumerateDeivces();
    showSupportedConstraints();

    resoultionList.addEventListener("change", getMedia);

    offerButton.addEventListener("click", offer);
    answerButton.addEventListener("click", answer);
  } else {
    alert("Not Supported Environment");
  }
}

init();

/*
Try calling localStream.getVideoTracks()[0].stop().

For SCTP, reliable and ordered delivery is true by default.
Notice the use of dataConstraint. Data channels can be configured to enable different types of data sharing — for example, prioritizing reliable delivery over performance.
With SCTP, the protocol used by WebRTC data channels, reliable and ordered data delivery is on by default. When might RTCDataChannel need to provide reliable delivery of data, and when might performance be more important — even if that means losing some data?

In order to set up and maintain a WebRTC call, WebRTC clients (peers) need to exchange metadata:

Candidate (network) information.
Offer and answer messages providing information about media, such as resolution and codecs.
In other words, an exchange of metadata is required before peer-to-peer streaming of audio, video, or data can take place. This process is called signaling.

What alternative messaging mechanisms might be possible? What problems might you encounter using 'pure' WebSocket?
What issues might be involved with scaling this application? Can you develop a method for testing thousands or millions of simultaneous room requests?

*/
