import fitz
p = r"C:\Users\LA\.dsh\attachments\v1\files\05\05a1fab75522fcd3ac1ddd582fa079b77740370bb6c035f44a698ecb6b036031\大学生实用就业指南.pdf"
doc = fitz.open(p)
# page 1: zone y 420-590 ; page 2: zone y 280-425
doc[0].get_pixmap(dpi=400, clip=fitz.Rect(20,280,592,600)).save(r"D:\Project\Vesta\zxg\guide\crop_p1.png")
doc[1].get_pixmap(dpi=400, clip=fitz.Rect(20,255,592,470)).save(r"D:\Project\Vesta\zxg\guide\crop_p2.png")
print("done")
