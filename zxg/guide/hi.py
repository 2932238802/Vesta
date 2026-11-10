import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
for i in (0,1):
    doc[i].get_pixmap(dpi=220).save(rf"D:\Project\Vesta\zxg\guide\hi{i+1}.png")
print("ok")
