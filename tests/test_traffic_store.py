import os
import tempfile
import unittest

from traffic_store import TrafficStore


class TrafficStoreTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.store = TrafficStore(state_file=os.path.join(self.tempdir.name, "traffic.json"))

    def test_snapshot_counts_recent_events(self):
        self.store.add_event({"type": "dns", "domain": "example.com", "source": "10.0.0.1"})
        self.store.add_event({"type": "tls", "domain": "api.example.com", "source": "10.0.0.2"})
        self.store.add_event({"type": "dns", "domain": "example.org", "source": "10.0.0.3"})

        snapshot = self.store.snapshot()

        self.assertEqual(snapshot["totals"]["dns"], 2)
        self.assertEqual(snapshot["totals"]["tls"], 1)
        self.assertEqual(snapshot["totals"]["events"], 3)
        self.assertEqual(len(snapshot["recent_events"]), 3)
        self.assertEqual(snapshot["recent_events"][0]["domain"], "example.org")


if __name__ == "__main__":
    unittest.main()
