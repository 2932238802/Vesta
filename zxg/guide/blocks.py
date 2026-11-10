import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
for i in [0,1,2]:
    page = doc[i]
    print(f"########## PAGE {i+1} drawings={len(page.get_drawings())}")
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b["type"]!=0: 
            print("IMG BLOCK", b.get("bbox")); continue
        x0,y0,x1,y1 = [round(v,1) for v in b["bbox"]]
        txt = " | ".join("".join(s["text"] for s in l["spans"]) for l in b["lines"])
        print(f"[{x0},{y0},{x1},{y1}] {txt}")
