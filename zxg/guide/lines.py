import fitz, json
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
out = []
for i in range(doc.page_count):
    page = doc[i]
    lines = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        for l in b["lines"]:
            txt = "".join(s["text"] for s in l["spans"])
            if not txt.strip(): continue
            x0,y0,x1,y1 = l["bbox"]
            lines.append((round(y0,1), round(x0,1), round(x1,1), txt))
    lines.sort()
    out.append({"page": i+1, "lines": lines})
    print(f"===== PAGE {i+1} =====")
    for y,x0,x1,t in lines:
        print(f"{y:7.1f} {x0:6.1f}-{x1:6.1f} | {t}")
open(r"D:\Project\Vesta\zxg\guide\lines_all.json","w",encoding="utf-8").write(json.dumps(out,ensure_ascii=False,indent=1))
