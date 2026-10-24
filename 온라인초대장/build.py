from pathlib import Path
import json, html
from email.message import EmailMessage
from email.policy import SMTP

P = Path(__file__).resolve().parent
C = json.loads((P/'설정.json').read_text(encoding='utf-8-sig'))
def make(mode):
    def image(name, key, alt):
        url = ('cid:'+name if mode=='cid' else C.get(key,'') if mode=='remote' else ('email-assets/' if name in ['header.png', 'invitation-body.png'] else 'assets/')+name)
        if not url: url = '{{'+key.upper()+'}}'
        layer = 'position:relative;z-index:0;margin-top:-20%;margin-bottom:-24%;' if name == 'motion.gif' else 'position:relative;z-index:1;'
        return f'<img src="{html.escape(url,quote=True)}" width="600" alt="{alt}" style="display:block;width:100%;max-width:600px;height:auto;border:0;{layer}">'
    buttons=''
    for label,key in [('WEBSITE','website'),('INSTAGRAM','instagram'),('CONTACT','contact_email')]:
        url=C.get(key,'')
        if key=='contact_email' and url and not url.startswith(('mailto:', 'https://', 'http://', 'tel:')): url='mailto:'+url
        url=url or '{{'+key.upper()+'}}'
        button_key = 'contact' if key == 'contact_email' else key
        name = 'button-' + button_key + '.png'
        button_src = 'cid:' + name if mode == 'cid' else C['button_' + button_key + '_url'] if mode == 'remote' else 'email-assets/' + name
        buttons+=f'<td width="33.33%" align="center" style="padding:0 5px"><a href="{html.escape(url,quote=True)}" style="display:block;font-family:ITC Avant Garde Gothic Pro Demi,sans-serif;font-weight:600;font-style:normal;line-height:36px;letter-spacing:0;text-align:center;text-decoration:none"><img src="{html.escape(button_src,quote=True)}" width="160" height="64" alt="{label}" style="display:block;width:100%;max-width:160px;height:auto;border:0;"></a></td>'
    return '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>2026 세종대학교 디자인이노베이션 졸업전시회 초대장</title></head>
<body style="margin:0;padding:0;background:#141414;font-family:Arial,'Malgun Gothic',sans-serif;color:#141414">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">2026 세종대학교 디자인이노베이션 45회 졸업전시회에 초대합니다.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#141414">
<tr><td>'''+image('header.png','header_url','2026 세종대학교 디자인이노베이션 졸업전시회')+image('motion.gif','gif_url','은빛 단추가 움직이는 졸업전시회 무빙그래픽')+image('title.png','title_url','forward, Button up!')+'''</td></tr>
<tr><td bgcolor="#dce5f2" style="background:linear-gradient(180deg,#f0f4f8 0%,#dce5f2 52%,#7cabef 100%);padding:54px 32px 38px">
<div style="margin:0 0 38px">'''+image('invitation-body.png','body_url','디자인이노베이션 45회 졸업전시회 — 첫 단추를 잘 끼워야 한다는 말처럼, 단추는 시작을 여는 장치입니다. 서로 다른 색과 모양, 크기를 지닌 단추들이 각자의 자리에서 저마다의 시간을 지나 한곳에 모였습니다. 각기 다른 생각과 방식으로 만들어 온 결과물들은 실로 꿰어진 단추처럼 연결되며 새로운 가능성의 시작이 됩니다. 앞으로의 모습은 알 수 없지만, 지금 끼우는 첫 단추는 각자가 만들어 갈 수많은 미래로 이어질 것입니다. 가지각색의 우리가 함께 끼우는 첫 단추를 통해, 이곳에서 시작된 가능성들이 각자의 다음 자리로 이어지길 바랍니다.')+'''</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="32%" style="padding-right:18px"></td><td valign="top" style="font-family:Pretendard,Arial,'Malgun Gothic',sans-serif;font-weight:500;font-size:14px;line-height:1.65;letter-spacing:0;word-break:keep-all">
<p style="margin:0 0 12px;font-weight:bold">10.30(FRI) - 11.10(THU)<br>11AM - 7PM</p>
<p style="margin:0">세종대학교 광개토관 B1 세종뮤지엄갤러리 3관</p></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:60px;border-top:1px solid #8b949e"><tr><td style="padding-top:28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'''+buttons+'''</tr></table></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''

from local_layout import apply_local_layout
(P/'온라인초대장.html').write_text(apply_local_layout(make('local')),encoding='utf-8')
import sys
if '--local-only' in sys.argv:
    print('Updated browser HTML only')
    raise SystemExit(0)
(P/'이메일본문_외부이미지.html').write_text(make('remote'),encoding='utf-8')

remote_msg = EmailMessage(policy=SMTP)
remote_msg['Subject'] = '2026 세종대학교 디자인이노베이션 졸업전시회에 초대합니다'
remote_msg['X-Unsent'] = '1'
remote_msg.set_content('2026 세종대학교 디자인이노베이션 졸업전시회에 초대합니다. http://sj-di.com/2026-buttonup/')
remote_msg.add_alternative(make('remote'), subtype='html')
(P/'온라인초대장_외부이미지_메일초안.eml').write_bytes(bytes(remote_msg))

msg=EmailMessage(policy=SMTP)
msg['Subject']='2026 세종대학교 디자인이노베이션 졸업전시회에 초대합니다'
msg['X-Unsent']='1'
msg.set_content('2026 세종대학교 디자인이노베이션 45회 졸업전시회\n10.30(FRI) - 11.10(THU), 11AM - 7PM\n세종대학교 광개토관 B1 세종뮤지엄갤러리 3관')
msg.add_alternative(make('cid'),subtype='html')
for name,mime in [('header.png','png'),('motion.gif','gif'),('title.png','png'),('button-website.png','png'),('button-instagram.png','png'),('button-contact.png','png'),('invitation-body.png','png')]:
    msg.get_payload()[-1].add_related((P/('assets' if name in ['motion.gif','title.png'] else 'email-assets')/name).read_bytes(),maintype='image',subtype=mime,cid='<'+name+'>',filename=name,disposition='inline')
(P/'온라인초대장_메일초안.eml').write_bytes(bytes(msg))
missing=[k for k,v in C.items() if not v]
print('생성 완료. 미설정 항목:', ', '.join(missing))
