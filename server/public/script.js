const socket = io();

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

const mediaStreamConstraints = {
  default: {
    video: true
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

function getMedia() {
  if (resoultionList.value === "desktop") {
    navigator.mediaDevices.getDisplayMedia().then(stream => {
      localVideo.srcObject = stream;
    });
  } else {
    navigator.mediaDevices
      .getUserMedia(mediaStreamConstraints[resoultionList.value])
      .then(
        stream => {
          localVideo.srcObject = stream;
          stream.getTracks().forEach(track => {
            if (track.kind === "video") {
              showObject(videoStreamInfo, track.getCapabilities());
              showObject(currentVideoStream, track.getSettings());
            } else {
              showObject(audioStreamInfo, track.getCapabilities());
              showObject(currentAudioStream, track.getSettings());
            }
          });
        },
        err => alert(err.name + " : " + err.message)
      );
  }
}

function init() {
  if (navigator.mediaDevices) {
    showUserPlatform();
    showEnumerateDeivces();
    showSupportedConstraints();
    getMedia();

    resoultionList.addEventListener("change", getMedia);
  } else {
    alert("Not Supported Environment");
  }
}

init();
