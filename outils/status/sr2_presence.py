"""Read only aggregate presence from the independent SR2 transport."""
import json
import threading
import time
import urllib.request

TITLE = '01004cc023582000'
MAX = 16384

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def fetch_presence():
    # Fixed loopback service: no account dump or credential is needed.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open('http://127.0.0.1:18562/health', timeout=3) as response:
        if response.status != 200:
            raise ValueError('Transport status unavailable')
        raw = response.read(MAX + 1)
    if len(raw) > MAX:
        raise ValueError('Transport status oversized')
    return json.loads(raw)

def aggregate(data):
    if not isinstance(data, dict) or data.get('status') != 'ok':
        raise ValueError('Transport not ready')
    for field, limit in (('onlinePlayers', 768), ('playingPlayers', 768), ('rooms', 4096)):
        value = data.get(field)
        if type(value) is not int or not 0 <= value <= limit:
            raise ValueError('Transport aggregate invalid')
    return data['onlinePlayers']

class SR2Presence:
    def __init__(self, uch, fetch=fetch_presence, monotonic=time.monotonic):
        self.uch, self.fetch, self.monotonic = uch, fetch, monotonic
        self.lock = threading.Lock()
        self.at = None
        self.current = None

    def snapshot(self):
        with self.lock:
            if self.at is not None and self.monotonic() - self.at < 3:
                return dict(self.current)
            result = {'game': 'SpeedRunners 2: King of Speed', 'titleId': TITLE,
                      'online': False, 'players': None, 'countScope': 'native_transport_connections'}
            try:
                # Login and gameplay must both be available. Never reuse UCH players.
                if self.uch.snapshot() is not None:
                    result['players'] = aggregate(self.fetch())
                    result['online'] = True
            except Exception:
                pass  # An unavailable source is not a real zero.
            self.at, self.current = self.monotonic(), result
            return dict(result)
