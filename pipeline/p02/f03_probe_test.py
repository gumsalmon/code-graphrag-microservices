"""Offline synthetic HTTP fixtures; not PetClinic runtime evidence."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location("f03_probe",Path(__file__).with_name("f03-probe.py"))
p=importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class Response:
    status=200
    def __init__(self,body=b'{"items":[]}',status=200): self.body,self.status=body,status
    def read(self,_): return self.body
    def getheaders(self): return [("Content-Type","application/json")]


class Connection:
    def __init__(self,response=None): self.response=response or Response();self.sent=[];self.closed=False
    def request(self,*args,**kwargs): self.sent.append((args,kwargs))
    def getresponse(self): return self.response
    def close(self): self.closed=True


class ProbeTests(unittest.TestCase):
    def test_raw_http_kept_before_parse(self):
        body=b'{ "items" : [] }\n'; c=Connection(Response(body))
        with tempfile.TemporaryDirectory() as d,patch.object(p.http.client,"HTTPConnection",return_value=c):
            record,parsed=p.capture(Path(d),{"id":"direct","method":"GET","target":"visits","path":"/pets/visits?petId=7,8"})
            self.assertEqual((Path(d)/"direct.body").read_bytes(),body);self.assertEqual(parsed,{"items":[]});self.assertTrue(c.closed)
            self.assertIsNone(record["error"])

    def test_post_request_body_preserved(self):
        c=Connection()
        with tempfile.TemporaryDirectory() as d,patch.object(p.http.client,"HTTPConnection",return_value=c):
            request={"id":"create_control","method":"POST","target":"visits","path":"/owners/6/pets/7/visits",
                     "body":{"date":"2026-10-01","description":"P02 isolated write control"},"headers":{"Content-Type":"application/json"}}
            r,_=p.capture(Path(d),request)
            self.assertEqual(json.loads((Path(d)/r["request_body_file"]).read_bytes()),request["body"])
            self.assertEqual(c.sent[0][0][0],"POST")

    def test_no_arbitrary_targets_methods_writes_or_names(self):
        base={"id":"probe","method":"GET","target":"visits","path":"/pets/visits"}
        for changes in ({"target":"production"},{"method":"DELETE"},{"path":"//external"},{"id":"../escape"},
                        {"method":"POST"},{"path":"/x\r\ninjection"}):
            with tempfile.TemporaryDirectory() as d,self.assertRaises(ValueError):p.capture(Path(d),{**base,**changes})

    def test_transport_failure_has_record_not_empty_success(self):
        c=Connection();c.getresponse=lambda: (_ for _ in ()).throw(TimeoutError("synthetic timeout"))
        with tempfile.TemporaryDirectory() as d,patch.object(p.http.client,"HTTPConnection",return_value=c):
            r,b=p.capture(Path(d),{"id":"probe","method":"GET","target":"gateway","path":"/api/gateway/owners/6"})
            self.assertIsNone(b);self.assertIsNone(r["status"]);self.assertIn("TimeoutError",r["error"]);self.assertTrue((Path(d)/"probe.json").exists())

    def test_bad_json_remains_raw(self):
        with tempfile.TemporaryDirectory() as d,patch.object(p.http.client,"HTTPConnection",return_value=Connection(Response(b'not json'))):
            r,b=p.capture(Path(d),{"id":"probe","method":"GET","target":"visits","path":"/pets/visits"})
            self.assertIsNone(b);self.assertIsNone(r["error"]);self.assertEqual((Path(d)/"probe.body").read_bytes(),b'not json')

    def test_fresh_ready_does_not_require_mutated_seed_to_return_positive_fixture(self):
        self.assertTrue(p.ready("visits",[{"id":1},{"id":4}]))
        self.assertFalse(p.ready("visits",[{"id":1},{"id":4},{"id":5}]))
        self.assertTrue(p.ready("gateway",{"id":6,"pets":[{"id":7,"visits":[]},{"id":8,"visits":[]}]}))

    def test_partial_body_limit_error_preserved(self):
        body=b'x'*(4*1024*1024+1)
        with tempfile.TemporaryDirectory() as d,patch.object(p.http.client,"HTTPConnection",return_value=Connection(Response(body))):
            r,b=p.capture(Path(d),{"id":"probe","method":"GET","target":"visits","path":"/pets/visits"})
            self.assertIn("incomplete",r["error"]);self.assertEqual((Path(d)/"probe.body").stat().st_size,len(body))


if __name__=="__main__":unittest.main()
