"""Aggregate existing authenticated SR2 title presence; identities never leave this module."""
import datetime
import json
import re
import threading
import time
import urllib.request
from pathlib import Path

TITLE = '01004cc023582000'
MAX = 2 * 1024 * 1024
TTL = 90  # Same expiry as the account service's getPresence().
KEY = Path('/opt/nextendo-account/internal_key.txt')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch_presence():
    # Operator-authorized, existing internal credential, fixed loopback only.
    key = KEY.read_text().strip()
    if not key or len(key) > 8192 or '\n' in key or '\r' in key:
        raise ValueError('Presence credential unavailable')
    request = urllib.request.Request('http://127.0.0.1:8095/internal/presence-dump',
                                     headers={'X-Internal-Key': key})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(request, timeout=3) as response:
        if response.status != 200:
            raise ValueError('Presence source unavailable')
        raw = response.read(MAX + 1)
    if len(raw) > MAX:
        raise ValueError('Presence source oversized')
    return json.loads(raw)


def aggregate(data, now):
    presence = data.get('presence') if isinstance(data, dict) else None
    if not isinstance(presence, dict) or len(presence) > 50000:
        raise ValueError('Presence source invalid')
    count = 0
    for pid, entry in presence.items():
        # The existing store may contain an anonymous sentinel; it is not a player.
        if pid == '0':
            continue
        if not isinstance(pid, str) or not re.fullmatch(r'[1-9][0-9]{0,19}', pid) or int(pid) >= 2**64:
            raise ValueError('Presence key invalid')
        if not isinstance(entry, dict):
            raise ValueError('Presence record invalid')
        title = entry.get('AppID')
        if not isinstance(title, str):
            raise ValueError('Presence title invalid')
        if title.lower() != TITLE:
            continue
        status = entry.get('Status')
        if type(status) is not int or status not in (0, 1, 2):
            raise ValueError('Presence status invalid')
        if status != 2:
            continue
        stamp = entry.get('Updated')
        if not isinstance(stamp, str) or len(stamp) > 64:
            raise ValueError('Presence freshness invalid')
        parsed = datetime.datetime.fromisoformat(stamp.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            raise ValueError('Presence timezone invalid')
        age = now - parsed.timestamp()
        if age < -5:
            raise ValueError('Presence clock invalid')
        if age <= TTL:
            count += 1
    return count


class SR2Presence:
    def __init__(self, uch, fetch=fetch_presence, clock=time.time, monotonic=time.monotonic):
        self.uch, self.fetch, self.clock, self.monotonic = uch, fetch, clock, monotonic
        self.lock = threading.Lock()
        self.at = None
        self.current = None

    def snapshot(self):
        with self.lock:
            if self.at is not None and self.monotonic() - self.at < 3:
                return dict(self.current)
            # The monitored UCH dispatcher is the shared SR2 Nextendo sign-in service.
            # Never reuse UCH's player quantity for SR2; Photon carries the matches.
            try:
                online = self.uch.snapshot() is not None
            except Exception:
                online = False
            result = {'game': 'SpeedRunners 2: King of Speed', 'titleId': TITLE,
                      'online': online, 'players': None, 'countScope': 'recent_game_presence'}
            if online:
                try:
                    result['players'] = aggregate(self.fetch(), self.clock())
                except Exception:
                    # A failure is not a real zero. Cache only the anonymous aggregate.
                    pass
            self.at, self.current = self.monotonic(), result
            return dict(result)
