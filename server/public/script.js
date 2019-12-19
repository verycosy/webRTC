const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const resoultionList = document.getElementById("resolutionList");
const mediaConstraintList = document.getElementById("mediaConstraintList");
const enumerateDeviceList = document.getElementById("enumerateDeviceList");

const offerButton = document.getElementById("offer");
const answerButton = document.getElementById("answer");

const videoStreamInfo = document.getElementById("videoStreamInfo");
const currentVideoStream = document.getElementById("currentVideoStream");

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

function getMedia() {
  navigator.mediaDevices
    .getUserMedia(mediaStreamConstraints[resoultionList.value])
    .then(
      stream => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => {
          if (track.kind === "video") {
            const {
              width: cwidth,
              height: cheight,
              resizeMode: cresizeMode,
              frameRate: cframeRate,
              facingMode: cfacingMode,
              aspectRatio: caspectRatio
            } = track.getCapabilities();

            const {
              frameRate,
              width,
              height,
              resizeMode,
              aspectRatio
            } = track.getSettings();

            videoStreamInfo.innerText = `${track.label}
                width : ${cwidth["min"]} ~ ${cwidth["max"]}
                height : ${cheight["min"]} ~ ${cheight["max"]}
                resize mode : ${cresizeMode.map(mode => mode)}
                aspect ratio : ${caspectRatio["min"]} ~ ${caspectRatio["max"]}
                frame rate : ${cframeRate["min"]} ~ ${cframeRate["max"]}
                facing mode : ${cfacingMode.map(mode => mode)}`;

            currentVideoStream.innerText = `
                width : ${width}
                height : ${height}
                resize mode : ${resizeMode}
                aspect ratio : ${aspectRatio}
                frame rate : ${frameRate}`;
          }
        });
      },
      err => alert(err.name + " : " + err.message)
    );
}

function init() {
  if (navigator.mediaDevices) {
    showEnumerateDeivces();
    showSupportedConstraints();
    getMedia();

    resoultionList.addEventListener("change", getMedia);
  } else {
    alert("Not Supported Environment");
  }
}

init();
