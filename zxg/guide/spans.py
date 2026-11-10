import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
for i in [0,1]:
    page = doc[i]
    print(f"##### PAGE {i+1}")
    for b in page.get_text("rawdict")["blocks"]:
        if b["type"]!=0: continue
        for l in b["lines"]:
            for s in l["spans"]:
                w = "".join(c["c"] for c in s["chars"])
                if w.strip():
                    print(f'{s["bbox"][0]:6.1f},{s["bbox"][1]:6.1f} {s["size"]:4.1f} {s["font"][:22]:22s} {w}')
