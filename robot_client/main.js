import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

import firebaseConfig from '../firebase-creds.json';

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'turn:global.relay.metered.ca:80'],
      username: '44c9631bd1b19bfc2e7a0033',
      credential: 'XvPuyryKqj39K2AO'
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let callId = null;
var sendChannel = null;
var socket = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const startUpConnectionButton = document.getElementById('startupConnectionButton');
const endConnectionButton = document.getElementById('endConnectionButton');
// 1. Setup media sources

webcamButton.onclick = async () => {
  // Create a WebSocket connection
  socket = new WebSocket("ws://localhost:1235/");
  // Create the data channel and establish its event listeners
  sendChannel = pc.createDataChannel("sendChannel");
  sendChannel.addEventListener("open", handleSendChannelStatusChange);
  sendChannel.onclose = handleSendChannelStatusChange;
  sendChannel.onmessage = (event) => {
    console.log("Message received: " + event.data);
    if (socket !== null) {
      // Send data to the WebSocket server
      socket.send("Hello from the browser!");
    }
  };

  console.log("Data channel created");

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  webcamVideo.srcObject = localStream;

  startUpConnectionButton.disabled = false;
  endConnectionButton.disabled = false;
  webcamButton.disabled = true;

};

// 2. Create an offer
startUpConnectionButton.onclick = async () => {
  if (callId !== null) {
    console.log("Call already exists");
    return;
  }
  callId = "robot-1";
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc(callId);
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  console.log(callId);

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  // Write offer to Firestore document
  await callDoc.set({ offer });

  // Listen for remote answer after offer is successfully written to Firestore
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        if (pc.currentRemoteDescription) {
          pc.addIceCandidate(candidate);
        }
      }
      else {
        console.log("Change type: ", change.type);
      }
    });
  });

  endConnectionButton.disabled = false;
};

endConnectionButton.onclick = async () => {
  if (callId === null) {
    console.log("No call to end");
    return;
  }
  const callDoc = firestore.collection('calls').doc(callId);
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  const query = await offerCandidates.get();
  query.forEach((candidate) => {
    candidate.ref.delete();
  });

  const query2 = await answerCandidates.get();
  query2.forEach((candidate) => {
    candidate.ref.delete();
  });

  await callDoc.delete();
  callId = null;
}

function handleSendChannelStatusChange(event) {
  if (sendChannel) {
    var state = sendChannel.readyState;

    if (state === "open") {
      console.log("Data channel is open and ready to be used.");
    } else {
      console.log("Data channel is not open.");
    }
  }
}

function sendMessage() {
  sendChannel.send("Hello from the sender!");
}