import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHY6NUkLHVXpPlROI-h7sbcGZ-7AQJmQQ",
  authDomain: "mostepichack.firebaseapp.com",
  projectId: "mostepichack",
  storageBucket: "mostepichack.appspot.com",
  messagingSenderId: "965447933186",
  appId: "1:965447933186:web:662e74c777d1aac4eb761b",
  measurementId: "G-JFSPMD5KF9"
};

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

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

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

// Call renderDocuments function when the DOM content is loaded
document.addEventListener('DOMContentLoaded', renderDocuments);

// 1. Setup media sources

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};

// 2. Create an offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

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

  await callDoc.set({ offer });

  // Listen for remote answer
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
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
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

// 4. Establish a data channel
let dataChannel;

// Function to create a data channel
const createDataChannel = () => {

  console.log('Creating data channel...');

  dataChannel = pc.createDataChannel('json-data-channel');

  // Event listener for when the data channel is opened
  dataChannel.onopen = () => {
    console.log('Data channel opened');
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
  await pc.setLocalDescription(await pc.createOffer());
  const offer = { sdp: pc.localDescription.toJSON(), type: pc.localDescription.type };
  await callDoc.set({ offer });
  // Create data channel after setting the local description
  createDataChannel();
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

// Example usage: sending JSON data
sendJsonData({ key: 'value' });