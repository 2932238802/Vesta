import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
for m in ("text","blocks","words","dict"):
    t = doc[0].get_text(m)
    print(m, len(t))
print(repr(doc[0].get_text("text")[300:900]))
print("---- page2 zone text:", repr(doc[1].get_text("text", clip=fitz.Rect(0,280,600,430))))
print("---- page1 zone text:", repr(doc[0].get_text("text", clip=fitz.Rect(0,420,600,590))))
