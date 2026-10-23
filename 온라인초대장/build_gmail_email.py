from pathlib import Path
import json, re, html
from email.message import EmailMessage
from email.policy import SMTP

P = Path(__file__).resolve().parent
C = json.loads((P / '설정.json').read_text(encoding='utf-8-sig'))
source = (P / '이메일본문_외부이미지.html').read_text(encoding='utf-8')
hero_url = C['gmail_hero_url']
hero = '<tr><td bgcolor="#141414" style="padding:0;font-size:0;line-height:0"><img src="'+html.escape(hero_url, quote=True)+'" width="600" height="666" alt="2026 세종대학교 디자인이노베이션 졸업전시회 — forward, Button up!" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>'
source, count = re.subn(r'<tr><td><img.*?</td></tr>', lambda _: hero, source, count=1)
assert count == 1
def button(match):
    url, label = match.group(1), match.group(2)
    return ('<td width="33.33%" align="center" style="padding:0 5px">'
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
            '<tr><td bgcolor="#141414" align="center" style="border-radius:40px;padding:14px 4px">'
            f'<a href="{url}" style="color:#e4e4e4;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none"><font color="#e4e4e4">{label}</font></a>'
            '</td></tr></table></td>')
source, count = re.subn(r'<td width="33\.33%" align="center" style="padding:0 5px"><a href="([^"]*)"[^>]*>(WEBSITE|INSTAGRAM|CONTACT)</a></td>', button, source)
assert count == 3
(P / 'Gmail용_온라인초대장.html').write_text(source, encoding='utf-8')
msg = EmailMessage(policy=SMTP)
msg['Subject'] = '2026 세종대학교 디자인이노베이션 졸업전시회에 초대합니다'
msg['X-Unsent'] = '1'
msg.set_content('2026 세종대학교 디자인이노베이션 졸업전시회에 초대합니다. http://sj-di.com/2026-buttonup/')
msg.add_alternative(source, subtype='html')
(P / 'Gmail용_메일초안.eml').write_bytes(bytes(msg))
print('Gmail HTML and EML generated')
