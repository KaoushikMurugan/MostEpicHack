import socket
import json
import time

# Define the UDP server address and port
UDP_IP = 'localhost'
UDP_PORT = 5005

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

test_messages = [
    {"id": 1, "content": "This is message 1"},
    {"id": 2, "content": "This is message 2"},
    {"id": 3, "content": "This is message 3"}
]

# Send test messages as JSON

# Only send if the connect button is clicked

for msg in test_messages:
    # Convert message to JSON format
    json_msg = json.dumps(msg)

    # Send JSON message
    sock.sendto(json_msg.encode(), (UDP_IP, UDP_PORT))
    print(f"Sent message: {json_msg}")

# Close the socket
sock.close()
