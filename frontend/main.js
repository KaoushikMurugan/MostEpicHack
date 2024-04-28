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

// Function to fetch documents from Firestore collection
const renderDocuments = async () => {
  try {
    const collectionRef = firestore.collection('calls');
    const querySnapshot = await collectionRef.get();

    // Get document IDs
    const documentIDs = querySnapshot.docs.map(doc => doc.id);
    console.log(documentIDs);

    // Clear previous data
    const documentListElement = document.getElementById('documentList');
    documentListElement.innerHTML = '';

    // Create and add the default option
    const defaultOption = document.createElement('option');
    defaultOption.value = ''; // Optionally, you can set a value for the default option
    defaultOption.textContent = '>>>---- SELECT ROBOT ----<<<';
    defaultOption.disabled = true;
    defaultOption.selected = true; // Make this option selected
    documentListElement.appendChild(defaultOption);

    // Render documents
    documentIDs.forEach(documentID => {
      const option = document.createElement('option');
      option.value = documentID;
      option.textContent = documentID;
      documentListElement.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
  }
};

// Call renderDocuments function when the DOM content is loaded
document.addEventListener('DOMContentLoaded', renderDocuments);

// Call renderDocuments function when the DOM content is loaded
document.addEventListener('DOMContentLoaded', renderDocuments);

// Global State
const pc = new RTCPeerConnection(servers);
let remoteVideo = document.getElementById('remoteVideo');

var connectButton = null;
var disconnectButton = null;

var localConnection = null;   // RTCPeerConnection for our "local" connection
var remoteConnection = null;  // RTCPeerConnection for the "remote"

var sendChannel = null;       // RTCDataChannel for the local (sender)
var receiveChannel = null;    // RTCDataChannel for the remote (receiver)

var remoteStream = null;      // MediaStream from remote peer

function startup() {
  connectButton = document.getElementById('connectButton');
  disconnectButton = document.getElementById('disconnectButton');

  // Set event listeners for user interface widgets

  connectButton.addEventListener('click', connectPeers, false);
  disconnectButton.addEventListener('click', disconnectPeers, false);
}

function addKeyDownEventListener() {
  // Add an event listener for the keydown event
  console.log("added event listener");
  window.addEventListener('keydown', keydownListener);
}

function removeKeyDownEventListener() {
  // Remove the event listener for the keydown event
  window.removeEventListener('keydown', keydownListener);
  console.log("removed event listener");
}

function keydownListener(event) {
  // Handle the keydown event
  console.log(event.key);
}

// Connect the two peers. Normally you look for and connect to a remote
// machine here, but we're just connecting two local objects, so we can
// bypass that step.

// Function to connect to a selected document ID
const connectToDocument = async (documentId) => {
  console.log('Connecting to document:', documentId);
  const callDoc = firestore.collection('calls').doc(documentId);
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
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};

function connectPeers() {
  let selectedDocumentId = null;

  // Close any existing connections and streams
  if (localConnection) {
    localConnection.close();
    localConnection = null;
  }
  if (remoteConnection) {
    remoteConnection.close();
    remoteConnection = null;
  }
  if (sendChannel) {
    sendChannel.close();
    sendChannel = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
    remoteVideo.srcObject = null;
  }

  // Create the local connection and its event listeners
  localConnection = new RTCPeerConnection();
  // Create the data channel and establish its event listeners
  sendChannel = localConnection.createDataChannel("sendChannel");
  sendChannel.onopen = handleSendChannelStatusChange;
  sendChannel.onclose = handleSendChannelStatusChange;

  addKeyDownEventListener();

  // Create the remote connection and its event listeners
  remoteConnection = new RTCPeerConnection();
  remoteConnection.ondatachannel = receiveChannelCallback;

  // Set up the ICE candidates for the two peers
  localConnection.onicecandidate = e => !e.candidate
    || remoteConnection.addIceCandidate(e.candidate)
      .catch(handleAddCandidateError);
  remoteConnection.onicecandidate = e => !e.candidate
    || localConnection.addIceCandidate(e.candidate)
      .catch(handleAddCandidateError);

  // Now create an offer to connect; this starts the process
  localConnection.createOffer()
    .then(offer => localConnection.setLocalDescription(offer))
    .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
    .then(() => remoteConnection.createAnswer())
    .then(answer => remoteConnection.setLocalDescription(answer))
    .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
    .catch(handleCreateDescriptionError);

  // Call the function to connect to the selected document ID
  selectedDocumentId = document.getElementById('documentList').value;
  connectToDocument(selectedDocumentId);

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = handleTrackEvent;

  console.log("Remote stream: ", remoteStream);
  remoteVideo.srcObject = remoteStream;
}

// Handle errors attempting to create a description;
// this can happen both when creating an offer and when
// creating an answer. In this simple example, we handle
// both the same way.

function handleCreateDescriptionError(error) {
  console.log("Unable to create an offer: " + error.toString());
}


// Handle successful addition of the ICE candidate
// on the "local" end of the connection.

function handleLocalAddCandidateSuccess() {
  connectButton.disabled = true;
}

// Handle successful addition of the ICE candidate
// on the "remote" end of the connection.

function handleRemoteAddCandidateSuccess() {
  disconnectButton.disabled = false;
}

// Handle an error that occurs during addition of ICE candidate.

function handleAddCandidateError() {
  console.log("Oh noes! addICECandidate failed!");
}

// Handle status changes on the local end of the data
// channel; this is the end doing the sending of data
// in this example.

function handleSendChannelStatusChange(event) {
  if (sendChannel) {
    var state = sendChannel.readyState;

    if (state === "open") {
      console.log("send channel is open")
      disconnectButton.disabled = false;
      connectButton.disabled = true;
    } else {
      connectButton.disabled = false;
      disconnectButton.disabled = true;
    }
  }
}

// Called when the connection opens and the data
// channel is ready to be connected to the remote.

function receiveChannelCallback(event) {
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleReceiveMessage;
  receiveChannel.onopen = handleReceiveChannelStatusChange;
  receiveChannel.onclose = handleReceiveChannelStatusChange;
}

// Handle onmessage events for the receiving channel.
// These are the data messages sent by the sending channel.

function handleReceiveMessage(event) {
  var el = document.createElement("p");
  var txtNode = document.createTextNode(event.data);

  el.appendChild(txtNode);
  receiveBox.appendChild(el);
}

// Handle status changes on the receiver's channel.

function handleReceiveChannelStatusChange(event) {
  if (receiveChannel) {
    console.log("Receive channel's status has changed to " +
      receiveChannel.readyState);
  }

  // Here you would do stuff that needs to be done
  // when the channel's status changes.
}

// Define the callback function to handle incoming tracks

function handleTrackEvent(event) {
  console.log("Track event fired");
  // Add track to remote stream
  if (!remoteStream) {
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
  }
  remoteStream.addTrack(event.track);
}

// Close the connection, including data channels if they're open.
// Also update the UI to reflect the disconnected status.

function disconnectPeers() {
  removeKeyDownEventListener();
  // Close the RTCDataChannels if they're open.

  sendChannel.close();
  receiveChannel.close();

  // Close the RTCPeerConnections

  localConnection.close();
  remoteConnection.close();

  // Stop the tracks in the remoteStream
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  pc.ontrack = null;

  // Clear the srcObject of the remoteVideo element
  remoteVideo.srcObject = null;

  sendChannel = null;
  receiveChannel = null;
  localConnection = null;
  remoteConnection = null;

  // Update user interface elements

  connectButton.disabled = false;
  disconnectButton.disabled = true;
}

// Set up an event listener which will run the startup
// function once the page is done loading.

window.addEventListener('load', startup, false);