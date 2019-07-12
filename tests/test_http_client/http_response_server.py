#! /usr/bin/env python3

# This script starts an http server listening on localhost:9999 that
# returns the request body text as the response for
# get, post, put, patch, and delete requests.

from collections import Counter
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler
import threading
import socketserver
from urllib.parse import parse_qs, urlparse

# IMPORTANT: The port being listened on must be the same as the port
# used in ./test_http_client.ts HttpResponse tests. It must also match
# the port of testURL in jest.config.js
PORT = 9999

tcp_server = None


def main():
    with AllowReuseAddressTCPServer(("", PORT), RequestHandler) as server:
        global tcp_server
        tcp_server = server
        server.serve_forever()


class AllowReuseAddressTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()

    def do_PUT(self):
        self.handle_request()

    def do_PATCH(self):
        self.handle_request()

    def do_DELETE(self):
        self.handle_request()

    def handle_request(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/shutdown':
            print('Shutting down')
            self.send_response(200)
            self.end_headers()
            threading.Thread(target=tcp_server.shutdown, daemon=True).start()
        else:
            query_dict = parse_qs(parsed_path.query)
            self.send_response(int(query_dict.get('status', [200])[0]))
            self.end_headers()
            self.wfile.write(
                query_dict.get('text', ['Please provide a "text" query param'])[0].encode())


if __name__ == '__main__':
    main()
