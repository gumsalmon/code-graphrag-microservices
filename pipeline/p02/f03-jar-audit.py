"""Read-only ZIP member comparison; no extraction or class execution."""
import argparse
import hashlib
import json
import zipfile


def inventory(path):
    output={}
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if info.is_dir(): continue
            if info.filename in output or info.file_size>128*1024*1024:
                raise ValueError("Duplicate/oversized JAR member")
            output[info.filename]=hashlib.sha256(archive.read(info)).hexdigest()
    return output


def properties(data):
    return dict(line.split("=",1) for line in data.decode("utf-8").splitlines()
                if line and not line.startswith("#") and "=" in line)


def audit(baseline,mutated):
    before,after=inventory(baseline),inventory(mutated)
    if set(before)!=set(after): raise ValueError("Added/deleted JAR members")
    changed=sorted(n for n in before if before[n]!=after[n])
    compiled=["BOOT-INF/classes/org/springframework/samples/petclinic/visits/web/VisitResource.class",
              "BOOT-INF/classes/org/springframework/samples/petclinic/visits/web/VisitResource$Visits.class"]
    metadata={"BOOT-INF/classes/git.properties":{"git.build.time"},"META-INF/build-info.properties":{"build.time"}}
    if any(n not in compiled and n not in metadata for n in changed): raise ValueError("Unexpected class/resource/dependency changed")
    if not all(n in changed for n in compiled): raise ValueError("Expected registered provider class changes absent")
    meta=[]
    with zipfile.ZipFile(baseline) as a,zipfile.ZipFile(mutated) as b:
        for name,allowed in metadata.items():
            left,right=properties(a.read(name)),properties(b.read(name))
            keys=sorted(k for k in set(left)|set(right) if left.get(k)!=right.get(k))
            if set(keys)-allowed: raise ValueError("Metadata changed beyond declared build timestamps")
            meta.append({"member":name,"changed_keys":keys,"baseline_sha256":before[name],"mutated_sha256":after[name]})
    return {"schema":"p02-f03-provider-jar-audit/1","members":len(before),"changed_members":changed,
            "dependency_jars_identical":all(before[n]==after[n] for n in before if n.startswith("BOOT-INF/lib/")),
            "build_metadata_differences":meta,"source_commit_authenticated_by_embedded_git_properties":False,
            "note":"Source identity uses pinned source archive and full source-file hashes. Embedded metadata only differs by time; two classes compile from one changed Java file.",
            "labels_created":False}


if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--baseline",required=True);parser.add_argument("--mutated",required=True)
    args=parser.parse_args();print(json.dumps(audit(args.baseline,args.mutated),indent=2))
