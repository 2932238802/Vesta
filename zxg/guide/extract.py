import fitz, json, os
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
print("pages", doc.page_count)
print("meta", doc.metadata)
toc = doc.get_toc()
print("toc entries", len(toc))
txt = []
for i, page in enumerate(doc):
    t = page.get_text("text")
    txt.append(f"\n===== PAGE {i+1} =====\n" + t)
open(r"D:\Project\Vesta\zxg\guide\raw_text.txt", "w", encoding="utf-8").write("".join(txt))
open(r"D:\Project\Vesta\zxg\guide\toc.json", "w", encoding="utf-8").write(json.dumps(toc, ensure_ascii=False, indent=1))
for t in toc[:80]: print(t)
