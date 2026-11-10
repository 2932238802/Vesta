import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
for i in [0,1]:
    page = doc[i]
    print(f"=== PAGE {i+1} ===")
    for d in page.get_drawings():
        print({k: (round(v,1) if isinstance(v,(int,float)) else v) for k,v in d.items() if k in ("rect","fill","color","width","type","fill_opacity")}, "items", len(d["items"]), d["items"][:3])
    print("xobjects", page.get_xobjects())
    print("annots", [a for a in page.annots()])
