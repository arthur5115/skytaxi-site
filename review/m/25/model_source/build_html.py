from pathlib import Path
import re,json
import model
ROOT=Path(__file__).resolve().parent
style=(ROOT/'style.css').read_text()
template=(ROOT/'interface.template.html').read_text()
html=template.replace('__CSS__',style).replace('__BASE_JSON__',json.dumps(model.BASE,ensure_ascii=False))
(ROOT/'虎頭埤_五跨互動計算模型_R1.html').write_text(html)
print('Built standalone five-span HTML')
