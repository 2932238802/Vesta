import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
for i in range(doc.page_count):
    page = doc[i]
    pix = page.get_pixmap(dpi=110)
    pix.save(rf"D:\Project\Vesta\zxg\guide\page{i+1:02d}.png")
    imgs = page.get_images(full=True)
    print(i+1, "images:", len(imgs), "rect", page.rect)
