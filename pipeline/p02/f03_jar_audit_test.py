import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path

spec=importlib.util.spec_from_file_location("jar_audit",Path(__file__).with_name("f03-jar-audit.py"))
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)


class JarTests(unittest.TestCase):
    def pair(self,folder,extra=None):
        classes=["BOOT-INF/classes/org/springframework/samples/petclinic/visits/web/VisitResource.class",
                 "BOOT-INF/classes/org/springframework/samples/petclinic/visits/web/VisitResource$Visits.class"]
        original={**{n:b'baseline' for n in classes},"BOOT-INF/lib/dependency.jar":b'public dependency',
                  "BOOT-INF/classes/git.properties":b'git.build.time=old\n',"META-INF/build-info.properties":b'build.time=old\n'}
        mutated={**original,**{n:b'mutated' for n in classes},"BOOT-INF/classes/git.properties":b'git.build.time=new\n',
                 "META-INF/build-info.properties":b'build.time=new\n',**(extra or {})}
        paths=[]
        for i,content in enumerate((original,mutated)):
            path=Path(folder)/(str(i)+'.jar')
            with zipfile.ZipFile(path,'w') as z:
                for name,data in content.items():z.writestr(name,data)
            paths.append(path)
        return paths

    def test_only_declared_classes_and_timestamp_metadata(self):
        with tempfile.TemporaryDirectory() as d:
            result=a.audit(*self.pair(d));self.assertTrue(result['dependency_jars_identical']);self.assertEqual(len(result['changed_members']),4)

    def test_changed_dependency_rejected(self):
        with tempfile.TemporaryDirectory() as d,self.assertRaises(ValueError):a.audit(*self.pair(d,{'BOOT-INF/lib/dependency.jar':b'changed'}))

    def test_added_member_rejected(self):
        with tempfile.TemporaryDirectory() as d,self.assertRaises(ValueError):a.audit(*self.pair(d,{'extra.class':b'changed'}))

    def test_metadata_beyond_time_rejected(self):
        with tempfile.TemporaryDirectory() as d,self.assertRaises(ValueError):a.audit(*self.pair(d,{'META-INF/build-info.properties':b'build.time=new\nbuild.version=wrong\n'}))


if __name__=='__main__':unittest.main()
