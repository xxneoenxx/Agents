def lin(c):
    c/=255
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#'); r,g,b=(int(h[i:i+2],16) for i in (0,2,4))
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    l1,l2=sorted((L(a),L(b)),reverse=True)
    return (l1+0.05)/(l2+0.05)
pairs=[
 ("Creme auf Petrol","#F4EDE0","#0F2B2E"),
 ("Creme auf Petrol-800","#F4EDE0","#14383C"),
 ("Pistazie auf Petrol","#A8C66C","#0F2B2E"),
 ("Pistazie-hell auf Petrol","#C8E09A","#0F2B2E"),
 ("Zitrone auf Petrol","#E8C547","#0F2B2E"),
 ("Creme auf Amarena","#F4EDE0","#8E1F3D"),
 ("Amarena-hell auf Petrol","#E8899F","#0F2B2E"),
 ("Creme-gedimmt auf Petrol","#C5BCA9","#0F2B2E"),
 ("--- Eissorten (helle Sektion) ---","#000000","#000000"),
 ("Ink auf Pistazie","#0B1A10","#A8C66C"),
 ("Ink auf Amarena-Eis","#FFF3F6","#A81F45"),
 ("Ink auf Stracciatella","#2A2118","#F2E6D2"),
 ("Ink auf Zitrone","#2E2606","#E8C547"),
 ("Ink auf Haselnuss","#231206","#C08A5E"),
]
for name,a,b in pairs:
    if a==b: print(f"\n{name}"); continue
    v=cr(a,b)
    print(f"{'OK ' if v>=4.5 else ('GROSS' if v>=3 else 'FAIL')} {v:5.2f}:1  {name}  ({a} / {b})")
