import unittest
from sr2_presence import aggregate, SR2Presence, TITLE

class Dispatcher:
    def __init__(self, online=True): self.online = online
    def snapshot(self): return (set(), [], True) if self.online else None

def status(n=2):
    return {'status': 'ok', 'onlinePlayers': n, 'playingPlayers': n, 'rooms': 1}

class Tests(unittest.TestCase):
    def test_real_zero_and_active_connections(self):
        self.assertEqual(aggregate(status(0)), 0)
        self.assertEqual(aggregate(status(2)), 2)
    def test_failure_is_not_zero_or_operational(self):
        def fail(): raise OSError()
        result=SR2Presence(Dispatcher(),fetch=fail).snapshot()
        self.assertFalse(result['online'])
        self.assertIsNone(result['players'])
    def test_invalid_health_fails_closed(self):
        for source in ({},dict(status(),status='failed'),dict(status(),onlinePlayers=True),
                       dict(status(),onlinePlayers=-1),dict(status(),onlinePlayers=769),
                       dict(status(),rooms=4097),dict(status(),playingPlayers='2')):
            with self.assertRaises(ValueError): aggregate(source)
    def test_dispatcher_failure_does_not_fetch(self):
        service=SR2Presence(Dispatcher(False),fetch=lambda:self.fail('must not fetch'))
        self.assertFalse(service.snapshot()['online'])
    def test_aggregate_only_cache_and_expiry(self):
        calls=[];now=[10]
        def fetch(): calls.append(1);return dict(status(),privateExample='must never leave')
        service=SR2Presence(Dispatcher(),fetch=fetch,monotonic=lambda:now[0])
        self.assertEqual(service.snapshot()['players'],2)
        self.assertEqual(service.snapshot()['players'],2)
        self.assertEqual(len(calls),1)
        now[0]=14
        result=service.snapshot()
        self.assertEqual(len(calls),2)
        self.assertTrue(result['online'])
        self.assertEqual(result['titleId'],TITLE)
        self.assertEqual(set(result),{'game','titleId','online','players','countScope'})

if __name__=='__main__':unittest.main()
