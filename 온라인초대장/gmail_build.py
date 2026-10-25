"""Build Gmail assets from the approved 1080px invitation design.

Run: python gmail_build.py
After hosting the generated files, fill gmail-settings.json, then run again.
"""
from pathlib import Path
from io import BytesIO
from types import SimpleNamespace
import sys, subprocess, json, re, html
from email.message import EmailMessage
from email.policy import SMTP
from PIL import Image, ImageDraw, ImageFont

P = Path(__file__).resolve().parent
A = P / 'gmail-assets'
A.mkdir(exist_ok=True)
RUNTIME = Path('C:/Users/dlqfu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')

if '--html-only' not in sys.argv:
    def decompress(data):
        return subprocess.run(['node', '-e', "const z=require('zlib'),fs=require('fs');process.stdout.write(z.brotliDecompressSync(fs.readFileSync(0)));"],input=data,stdout=subprocess.PIPE,check=True).stdout

    # FontTools can use Node's bundled Brotli decoder without installing packages.
    sys.modules.setdefault('brotli', SimpleNamespace(decompress=decompress))
    from fontTools.ttLib import TTFont
    _variable_font = TTFont(P / 'assets/PretendardVariable.woff2')
    _axes = [(axis.axisTag, axis.defaultValue) for axis in _variable_font['fvar'].axes]
    _variable_font.flavor = None
    _font_buffer = BytesIO(); _variable_font.save(_font_buffer)
    _font_bytes = _font_buffer.getvalue()

    def font(size, weight):
        face = ImageFont.truetype(BytesIO(_font_bytes), round(size))
        face.set_variation_by_axes([weight if tag == 'wght' else default for tag, default in _axes])
        return face

    def lines(draw, text, xy, face, fill, line_height):
        for n, line in enumerate(text.split('\n')):
            draw.text((xy[0],xy[1]+n*line_height), line, font=face, fill=fill, anchor='lt')

    def wrap(text, face, width):
        result=[]; line=''
        for word in text.split():
            test=(line+' '+word).strip()
            if line and face.getlength(test)>width:
                result.append(line); line=word
            else: line=test
        if line: result.append(line)
        return '\n'.join(result)

    source_html=(P/'온라인초대장.html').read_text(encoding='utf-8')
    title_font=font(36.96,600); heading_font=font(28,700)
    body_font=font(26,500); date_font=font(26,700)
    header=Image.new('RGBA',(1080,155),'#141414'); d=ImageDraw.Draw(header)
    lines(d,'2026 세종대학교\n디자인이노베이션 졸업전시회',(56,56),title_font,'#e4e4e4',46)
    logo_png=A/'logo-render.png'
    subprocess.run(['node','-e',"const sharp=require(process.argv[1]);sharp(process.argv[2]).resize(150,36).png().toFile(process.argv[3]);",str(RUNTIME/'sharp'),str(P/'assets/header-logo.svg'),str(logo_png)],check=True)
    header.alpha_composite(Image.open(logo_png).convert('RGBA'),(872,56)); logo_png.unlink()

    motion=Image.open(P/'assets/motion.gif')
    title=Image.open(P/'assets/title.png').convert('RGBA')
    frames=[]; durations=[]
    for i in range(motion.n_frames):
        motion.seek(i); duration=motion.info.get('duration',40)
        if i%2: durations[-1]+=duration; continue
        canvas=Image.new('RGBA',(1080,1207),'#141414')
        canvas.alpha_composite(motion.convert('RGBA'),(0,-61))
        canvas.alpha_composite(header,(0,0)); canvas.alpha_composite(title,(0,760))
        if i==124: canvas.convert('RGB').save(A/'top-preview.png')
        frames.append(canvas.convert('RGB').resize((600,671),Image.Resampling.LANCZOS).quantize(colors=192))
        durations.append(duration)
    frames[0].save(A/'top.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=1,optimize=True)
    print('Animation rendered',flush=True)

    stops=[(.1574,(240,243,247)),(.3948,(227,234,244)),(.6229,(181,201,234)),(.9685,(126,172,242))]
    footer=Image.new('RGB',(1080,1077)); draw=ImageDraw.Draw(footer)
    for y in range(1077):
        t=y/1077
        if t<=stops[0][0]: color=stops[0][1]
        elif t>=stops[-1][0]: color=stops[-1][1]
        else:
            for (a,c1),(b,c2) in zip(stops,stops[1:]):
                if a<=t<=b:
                    f=(t-a)/(b-a); color=tuple(round(v+(w-v)*f) for v,w in zip(c1,c2)); break
        draw.line((0,y,1080,y),fill=color)
    lines(draw,'디자인이노베이션\n45회 졸업전시회',(76,1320-1207),heading_font,'#000',37)
    for key,y in [('intro-first',1320),('intro-second',1538),('intro-third',1644)]:
        text=html.unescape(re.search(r'<p class="'+key+r'">(.*?)</p>',source_html).group(1))
        lines(draw,wrap(text,body_font,634),(394,y-1207),body_font,'#141414',38)
    lines(draw,'10.30(FRI) - 11.10(THU)\n11AM - 7PM',(397,1792-1207),date_font,'#000',38)
    lines(draw,'세종대학교 광개토관 B1 세종뮤지엄갤러리 3관',(397,1889-1207),body_font,'#000',38)
    draw.line((76,2050-1207,1004,2050-1207),fill=(107,137,181),width=1)
    button_font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',30)
    for label,x,width in [('WEBSITE',70,228.61),('INSTAGRAM',404,267),('CONTACT',777.42,228.61)]:
        draw.rounded_rectangle((x,900,x+width,980),radius=100,fill='#141414')
        left,top,right,bottom=draw.textbbox((0,0),label,font=button_font)
        text_x=x+(width-(right-left))/2-left
        text_y=940-(bottom-top)/2-top
        draw.text((text_x,text_y),label,font=button_font,fill='#e4e4e4')
    footer.save(A/'footer-preview.png')
    footer.crop((0,0,1080,900)).save(A/'information.png')
    for key,x in [('website',0),('instagram',360),('contact',720)]: footer.crop((x,900,x+360,980)).save(A/(key+'.png'))
    footer.crop((0,980,1080,1077)).save(A/'bottom.png')

settings_file=P/'gmail-settings.json'
C=json.loads(settings_file.read_text(encoding='utf-8')) if settings_file.exists() else {'website':'http://sj-di.com/2026-buttonup/','instagram':'https://www.instagram.com/sdi.graduate/','contact':'tel:02-3408-3323','images':{key:'' for key in ['top','information','website','instagram','contact','bottom']}}
settings_file.write_text(json.dumps(C,ensure_ascii=False,indent=2),encoding='utf-8')
def make(remote):
    def image(key,width,alt):
        ext='gif' if key=='top' else 'png'
        url=C['images'][key] if remote else 'gmail-assets/'+key+'.'+ext
        url=url or '{{'+key.upper()+'_URL}}'
        return f'<img src="{html.escape(url,quote=True)}" width="{width}" alt="{html.escape(alt,quote=True)}" style="display:block;width:100%;height:auto;border:0;margin:0">'
    body='<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px"><tr><td style="font-size:0;line-height:0">'+image('top',600,'2026 세종대학교 디자인이노베이션 졸업전시회 — forward, Button up!')+'</td></tr><tr><td style="font-size:0;line-height:0">'+image('information',600,'디자인이노베이션 45회 졸업전시회. 10.30(FRI) - 11.10(THU), 11AM - 7PM. 세종대학교 광개토관 B1 세종뮤지엄갤러리 3관.')+'</td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed"><tr>'
    for key in ['website','instagram','contact']:
        body+='<td width="33.33%" style="font-size:0;line-height:0"><a href="'+html.escape(C[key],quote=True)+'">'+image(key,200,key.upper())+'</a></td>'
    body+='</tr></table></td></tr><tr><td style="font-size:0;line-height:0">'+image('bottom',600,'')+'</td></tr></table></td></tr></table>'
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gmail용 온라인 초대장</title></head><body style="margin:0;padding:0;background:#141414">'+body+'</body></html>'
for remote,name in [(False,'Gmail용_미리보기.html'),(True,'Gmail용_온라인초대장.html')]: (P/name).write_text(make(remote),encoding='utf-8')
msg=EmailMessage(policy=SMTP); msg['Subject']='2026 세종대학교 디자인이노베이션 졸업전시회에 초대합니다'; msg['X-Unsent']='1'
msg.set_content('2026 세종대학교 디자인이노베이션 45회 졸업전시회\n10.30(FRI) - 11.10(THU), 11AM - 7PM\n세종대학교 광개토관 B1 세종뮤지엄갤러리 3관\n'+C['website']+'\n'+C['instagram']+'\n02-3408-3323')
msg.add_alternative(make(True),subtype='html'); (P/'Gmail용_메일초안.eml').write_bytes(bytes(msg))
print('Gmail files generated',flush=True)
