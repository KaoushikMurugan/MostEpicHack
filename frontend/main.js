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
      username: '1adabb60af229cd01f08527e',
      credential: 'pdPQOuZxLH+hV2yR'
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;
var sendChannel = null;
let callId = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');

// Fetch documents from Firestore collection
const renderDocuments = async () => {
  const collectionRef = firestore.collection('calls');
  const querySnapshot = await collectionRef.get();

  // Get document IDs and log them in the console
  const documentIDs = querySnapshot.docs.map(doc => doc.id);
  console.log(documentIDs);

  // Clear previous data
  const documentListElement = document.getElementById('documentList');
  documentListElement.innerHTML = '';

  // Render documents
  documentIDs.forEach(documentData => {
    const listItem = document.createElement('li');
    listItem.textContent = JSON.stringify(documentData);
    documentListElement.appendChild(listItem);
  });
};

let callDoc; // Define callDoc outside the callback

// Call renderDocuments function when the DOM content is loaded
document.addEventListener('DOMContentLoaded', renderDocuments);

// 1. Setup media sources

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  answerButton.disabled = false;
  webcamButton.disabled = true;


  // Create the data channel and establish its event listeners
  sendChannel = pc.createDataChannel("sendChannel");
  sendChannel.onopen = handleSendChannelStatusChange;
  sendChannel.onclose = handleSendChannelStatusChange;
  hangupButton.addEventListener('click', sendMessage, false);
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};



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


/*
// 4. Establish a data channel
let dataChannel;

// Function to create a data channel
const createDataChannel = () => {

  console.log('Creating data channel...');

  dataChannel = pc.createDataChannel('json-data-channel');

  // Event listener for when the data channel is opened
  dataChannel.onopen = () => {
    console.log('Data channel opened');

    // Example usage: sending JSON data
    sendJsonData({ key: 'value' });
  };

  // Event listener for errors when creating or opening the data channel
  dataChannel.onerror = (error) => {
    console.error('Error with data channel:', error);
  };

  // Event listener for when the data channel is closed
  dataChannel.onclose = () => {
    console.log('Data channel closed');
  };

  // Event listener for when the data channel receives a message
  dataChannel.onmessage = (event) => {
    const jsonData = JSON.parse(event.data);
    console.log('Received JSON data:', jsonData);
    // Handle received JSON data as needed
  };
};

// Call createDataChannel function after peer connection is created
pc.onnegotiationneeded = async () => {
  if (!callDoc) {
    console.error('callDoc is not defined.');
    return;
  }

  await pc.setLocalDescription(await pc.createOffer());
  const offer = { sdp: pc.localDescription.toJSON(), type: pc.localDescription.type };
  try {
    await callDoc.set({ offer });
    // Create data channel after setting the local description
    createDataChannel();
  } catch (error) {
    console.error('Error setting offer in callDoc:', error);
  }
};

// Event listener for when a new data channel is created
pc.ondatachannel = (event) => {
  dataChannel = event.channel;
  dataChannel.onopen = () => {
    console.log('Data channel opened');
  };
  dataChannel.onmessage = (event) => {
    const jsonData = JSON.parse(event.data);
    console.log('Received JSON data:', jsonData);
    // Handle received JSON data as needed
  };
};

// Function to send JSON data over the data channel
const sendJsonData = (data) => {
  console.log(dataChannel);
  if (dataChannel && dataChannel.readyState === 'open') {
    const jsonData = JSON.stringify(data);
    dataChannel.send(jsonData);
    console.log('Sent JSON data:', jsonData);
  } else {
    console.error('Data channel is not open or not available');
  }
};
*/