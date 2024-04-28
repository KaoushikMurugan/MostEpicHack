import socket
import json
import time

# Sender configuration
UDP_IP = "localhost"  # IP address of the receiver
UDP_PORT = 5555       # Port number used for communication

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

while True:
    # Send JSON data over UDP
    data = {
        "timestwertertamp": time.time(),
        "valuerte": 42,
        # "timestewrtewtryamp": time.time(),
        # "valretue": 42,
        # "timestamtjp": time.time(),
        # "valuefgfdsgdfg": 42,
        # "timestfgamp": time.time(),
        # "valuefg": 42,
        # "timesfgtamp": time.time(),
        # "valufge": 42,
        # "timefgstamp": time.time(),
        # "valfue": 42,
    }
    json_data = json.dumps(data)
    sock.sendto(json_data.encode(), (UDP_IP, UDP_PORT))

    print("Sent data:", json_data)

# Send JSON data over UDP
sock.sendto(json_data.encode(), (UDP_IP, UDP_PORT))

# Close the socket
sock.close()
