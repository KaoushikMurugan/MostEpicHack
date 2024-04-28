import socket

# Define UDP server address and port
udp_server_address = ('localhost', 1236)

# Create a UDP socket
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Bind the UDP socket to the server address
udp_socket.bind(udp_server_address)

print("UDP server is listening on {}:{}".format(*udp_server_address))

while True:
    # Receive data from the UDP socket
    data, address = udp_socket.recvfrom(1024)  # Adjust buffer size as needed
    
    # Decode the received data assuming it's encoded as UTF-8
    message = data.decode('utf-8')
    
    # Print the received message
    print("Received message from {}: {}".format(address, message))
