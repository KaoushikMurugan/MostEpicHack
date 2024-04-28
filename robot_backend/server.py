import asyncio
import websockets
import socket

# Define UDP server address and port
udp_server_address = ('localhost', 1236)

# Create a UDP socket
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

async def hello(websocket, path):
    while True:
        name = await websocket.recv()
        forward_to_udp(name)

def forward_to_udp(message):
    # Send the message over UDP
    udp_socket.sendto(message.encode(), udp_server_address)


start_server = websockets.serve(hello, 'localhost', 1240)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()