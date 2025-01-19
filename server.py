import http.server
import socketserver
import json
import os
import webbrowser

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/scores.json':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            scores = json.loads(post_data.decode('utf-8'))
            
            # Sauvegarder les scores
            with open('scores.json', 'w') as f:
                json.dump(scores, f)
            
            self.send_response(200)
            self.end_headers()
        else:
            super().do_POST()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def run(server_class=socketserver.TCPServer, handler_class=GameHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Serveur démarré sur le port {port}...")
    webbrowser.open(f'http://localhost:{port}')
    httpd.serve_forever()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    run()
