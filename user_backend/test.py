import socket
import json
import time

# Sender configuration
UDP_IP = "127.0.0.1"  # IP address of the receiver
UDP_PORT = 5005       # Port number used for communication

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

while True:
    # Send JSON data over UDP
    data = {
        "timestamp": time.time(),
        "value": 42
    }
    json_data = json.dumps(data)
    sock.sendto(json_data.encode(), (UDP_IP, UDP_PORT))

# Send JSON data over UDP
sock.sendto(json_data.encode(), (UDP_IP, UDP_PORT))

# Close the socket
sock.close()
