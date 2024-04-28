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
// var sendChannel = null;
let callId = null;

var connectButton = null;
var disconnectButton = null;

var localConnection = null;   // RTCPeerConnection for our "local" connection
var remoteConnection = null;  // RTCPeerConnection for the "remote"

var sendChannel = null;       // RTCDataChannel for the local (sender)
var receiveChannel = null;    // RTCDataChannel for the remote (receiver)

function startup() {
  connectButton = document.getElementById('connectButton');
  disconnectButton = document.getElementById('disconnectButton');

  // Set event listeners for user interface widgets

  connectButton.addEventListener('click', connectPeers, false);
  disconnectButton.addEventListener('click', disconnectPeers, false);
}

// Connect the two peers. Normally you look for and connect to a remote
// machine here, but we're just connecting two local objects, so we can
// bypass that step.

function connectPeers() {
  // Create the local connection and its event listeners
  
  localConnection = new RTCPeerConnection();
  
  // Create the data channel and establish its event listeners
  sendChannel = localConnection.createDataChannel("sendChannel");
  sendChannel.onopen = handleSendChannelStatusChange;
  sendChannel.onclose = handleSendChannelStatusChange;
  
  // Create an array to store the inputs
  // var keyInputs = [];

  // Add an event listener for the keydown event
  window.addEventListener('keydown', function(event) {
    console.log(event.key);
    // Add the key to the keyInputs array
    // keyInputs.push(event.key);

    // Log the keyInputs array
    // console.log(keyInputs);
  });

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

// Handles clicks on the "Send" button by transmitting
// a message to the remote peer.

function sendMessage() {
  var message = messageInputBox.value;
  sendChannel.send(message);
  console.log("Sent: " + message);
  
  // Clear the input box and re-focus it, so that we're
  // ready for the next message.
  
  messageInputBox.value = "";
  messageInputBox.focus();
}

// Handle status changes on the local end of the data
// channel; this is the end doing the sending of data
// in this example.

function handleSendChannelStatusChange(event) {
  if (sendChannel) {
    var state = sendChannel.readyState;
  
    if (state === "open") {
      console.log("send channel is open")
      messageInputBox.disabled = false;
      messageInputBox.focus();
      sendButton.disabled = false;
      disconnectButton.disabled = false;
      connectButton.disabled = true;
    } else {
      messageInputBox.disabled = true;
      sendButton.disabled = true;
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

// Close the connection, including data channels if they're open.
// Also update the UI to reflect the disconnected status.

function disconnectPeers() {

  // Close the RTCDataChannels if they're open.
  
  sendChannel.close();
  receiveChannel.close();
  
  // Close the RTCPeerConnections
  
  localConnection.close();
  remoteConnection.close();

  sendChannel = null;
  receiveChannel = null;
  localConnection = null;
  remoteConnection = null;
  
  // Update user interface elements
  
  connectButton.disabled = false;
  disconnectButton.disabled = true;
  sendButton.disabled = true;
  
  messageInputBox.value = "";
  messageInputBox.disabled = true;
}

// Set up an event listener which will run the startup
// function once the page is done loading.

window.addEventListener('load', startup, false);


// // HTML elements
// const webcamButton = document.getElementById('webcamButton');
// const webcamVideo = document.getElementById('webcamVideo');
// const answerButton = document.getElementById('answerButton');
// const remoteVideo = document.getElementById('remoteVideo');

// // Fetch documents from Firestore collection
// const renderDocuments = async () => {
//   const collectionRef = firestore.collection('calls');
//   const querySnapshot = await collectionRef.get();

//   // Get document data
//   const documents = querySnapshot.docs.map(doc => {
//     return {
//       id: doc.id,
//       data: doc.data()
//     };
//   });

//   // Clear previous data
//   const documentListElement = document.getElementById('documentList');
//   documentListElement.innerHTML = '';

//   // Render documents as options in the dropdown menu
//   documents.forEach(document => {
//     const option = document.createElement('option');
//     option.value = document.id;
//     option.textContent = document.data.name; // Assuming the document has a 'name' field
//     documentListElement.appendChild(option);
//   });
// };

// let callDoc; // Define callDoc outside the callback

// // Call renderDocuments function when the DOM content is loaded
// document.addEventListener('DOMContentLoaded', renderDocuments);

// // 1. Setup media sources

// webcamButton.onclick = async () => {
//   localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
//   remoteStream = new MediaStream();

//   // Push tracks from local stream to peer connection
//   localStream.getTracks().forEach((track) => {
//     pc.addTrack(track, localStream);
//   });

//   // Pull tracks from remote stream, add to video stream
//   pc.ontrack = (event) => {
//     event.streams[0].getTracks().forEach((track) => {
//       remoteStream.addTrack(track);
//     });
//   };

//   webcamVideo.srcObject = localStream;
//   remoteVideo.srcObject = remoteStream;

//   answerButton.disabled = false;
//   webcamButton.disabled = true;


//   // Create the data channel and establish its event listeners
//   sendChannel = pc.createDataChannel("sendChannel");
//   sendChannel.onopen = handleSendChannelStatusChange;
//   sendChannel.onclose = handleSendChannelStatusChange;
//   hangupButton.addEventListener('click', sendMessage, false);
// };

// // 3. Answer the call with the unique ID
// answerButton.onclick = async () => {
//   const callDoc = firestore.collection('calls').doc(callId);
//   const answerCandidates = callDoc.collection('answerCandidates');
//   const offerCandidates = callDoc.collection('offerCandidates');

//   pc.onicecandidate = (event) => {
//     event.candidate && answerCandidates.add(event.candidate.toJSON());
//   };

//   const callData = (await callDoc.get()).data();

//   const offerDescription = callData.offer;
//   await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

//   const answerDescription = await pc.createAnswer();
//   await pc.setLocalDescription(answerDescription);

//   const answer = {
//     type: answerDescription.type,
//     sdp: answerDescription.sdp,
//   };

//   await callDoc.update({ answer });

//   offerCandidates.onSnapshot((snapshot) => {
//     snapshot.docChanges().forEach((change) => {
//       console.log(change);
//       if (change.type === 'added') {
//         let data = change.doc.data();
//         pc.addIceCandidate(new RTCIceCandidate(data));
//       }
//     });
//   });
// };



// function handleSendChannelStatusChange(event) {
//   if (sendChannel) {
//     var state = sendChannel.readyState;

//     if (state === "open") {
//       console.log("Data channel is open and ready to be used.");
//     } else {
//       console.log("Data channel is not open.");
//     }
//   }
// }

// function sendMessage() {
//   sendChannel.send("Hello from the sender!");
// }


// /*
// // 4. Establish a data channel
// let dataChannel;

// // Function to create a data channel
// const createDataChannel = () => {

//   console.log('Creating data channel...');

//   dataChannel = pc.createDataChannel('json-data-channel');

//   // Event listener for when the data channel is opened
//   dataChannel.onopen = () => {
//     console.log('Data channel opened');

//     // Example usage: sending JSON data
//     sendJsonData({ key: 'value' });
//   };

//   // Event listener for errors when creating or opening the data channel
//   dataChannel.onerror = (error) => {
//     console.error('Error with data channel:', error);
//   };

//   // Event listener for when the data channel is closed
//   dataChannel.onclose = () => {
//     console.log('Data channel closed');
//   };

//   // Event listener for when the data channel receives a message
//   dataChannel.onmessage = (event) => {
//     const jsonData = JSON.parse(event.data);
//     console.log('Received JSON data:', jsonData);
//     // Handle received JSON data as needed
//   };
// };

// // Call createDataChannel function after peer connection is created
// pc.onnegotiationneeded = async () => {
//   if (!callDoc) {
//     console.error('callDoc is not defined.');
//     return;
//   }

//   await pc.setLocalDescription(await pc.createOffer());
//   const offer = { sdp: pc.localDescription.toJSON(), type: pc.localDescription.type };
//   try {
//     await callDoc.set({ offer });
//     // Create data channel after setting the local description
//     createDataChannel();
//   } catch (error) {
//     console.error('Error setting offer in callDoc:', error);
//   }
// };

// // Event listener for when a new data channel is created
// pc.ondatachannel = (event) => {
//   dataChannel = event.channel;
//   dataChannel.onopen = () => {
//     console.log('Data channel opened');
//   };
//   dataChannel.onmessage = (event) => {
//     const jsonData = JSON.parse(event.data);
//     console.log('Received JSON data:', jsonData);
//     // Handle received JSON data as needed
//   };
// };

// // Function to send JSON data over the data channel
// const sendJsonData = (data) => {
//   console.log(dataChannel);
//   if (dataChannel && dataChannel.readyState === 'open') {
//     const jsonData = JSON.stringify(data);
//     dataChannel.send(jsonData);
//     console.log('Sent JSON data:', jsonData);
//   } else {
//     console.error('Data channel is not open or not available');
//   }
// };
// */