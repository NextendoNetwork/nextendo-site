import datetime
import unittest
from sr2_presence import aggregate, SR2Presence, TITLE

NOW = 1800000000


def player(age=0, title=TITLE, status=2):
    return {'AppID': title, 'Status': status,
            'Updated': datetime.datetime.fromtimestamp(NOW-age, datetime.timezone.utc).isoformat()}


class Dispatcher:
    def __init__(self, online=True): self.online = online
    def snapshot(self): return (set(), [], True) if self.online else None


class Tests(unittest.TestCase):
    def test_exact_title_freshness_and_status(self):
        data = {'presence': {'0': player(), '1': player(), '2': player(89), '3': player(91),
                             '4': player(title='0100fcf002a58000'), '5': player(status=1)}}
        self.assertEqual(aggregate(data, NOW), 2)

    def test_real_empty_source(self):
        self.assertEqual(aggregate({'presence': {}}, NOW), 0)

    def test_invalid_source_fails_closed(self):
        for source in ({}, {'presence': []}, {'presence': {'1': player(-20)}},
                       {'presence': {'1': dict(player(), Updated='invalid')}}):
            with self.assertRaises((ValueError, TypeError)): aggregate(source, NOW)

    def test_failure_is_not_zero(self):
        def fail(): raise OSError()
        result = SR2Presence(Dispatcher(), fetch=fail, clock=lambda: NOW).snapshot()
        self.assertTrue(result['online'])
        self.assertIsNone(result['players'])
        self.assertEqual(set(result), {'game', 'titleId', 'online', 'players', 'countScope'})

    def test_dispatcher_failure(self):
        service = SR2Presence(Dispatcher(False), fetch=lambda: self.fail('must not fetch'))
        self.assertFalse(service.snapshot()['online'])
        self.assertIsNone(service.snapshot()['players'])

    def test_aggregate_only_and_short_cache(self):
        calls=[]
        def fetch(): calls.append(1);return {'presence': {'1': player()}}
        service=SR2Presence(Dispatcher(),fetch=fetch,clock=lambda: NOW,monotonic=lambda: 10)
        self.assertEqual(service.snapshot()['players'],1)
        self.assertEqual(service.snapshot()['players'],1)
        self.assertEqual(len(calls),1)
        self.assertNotIn('presence',service.current)


if __name__ == '__main__': unittest.main()
