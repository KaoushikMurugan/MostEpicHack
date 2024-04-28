import asyncio
import websockets
import socket

async def handle_connection(websocket, path):
    # UDP configuration
    UDP_IP = "localhost"      # Listen to all available interfaces
    UDP_PORT = 5555         # Port number used for communication

    # Create a UDP socket
    udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    udp_sock.bind((UDP_IP, UDP_PORT))

    try:
        while True:
            # Receive data from the UDP socket
            data, addr = udp_sock.recvfrom(1024)  # buffer size is 1024 bytes

            # print(data)

            # Send the received data over WebSocket
            await websocket.send(data.decode())
    finally:
        # Close the UDP socket when done
        udp_sock.close()

start_server = websockets.serve(handle_connection, "localhost", 1234)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
