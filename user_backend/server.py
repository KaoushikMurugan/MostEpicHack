import asyncio
import websockets

async def handle_connection(websocket, path):
    while True:
        data = "hello"  # Replace with your data source
        await websocket.send(data)

start_server = websockets.serve(handle_connection, "localhost", 1234)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()